"""HTTP boundary.

Errors returned to clients do not include stack traces. The process reads
OPENAI_API_KEY only when generation is explicitly enabled, and only on the server.
"""

from __future__ import annotations

import logging
import os
import uuid
from dataclasses import dataclass

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from advanced_rag.api.limiter import RateLimiter
from advanced_rag.api.schemas import (
    EvaluateRequest,
    QueryRequest,
    QueryResponseModel,
    RetrieveResponseModel,
)
from advanced_rag.api_context import request_id_var
from advanced_rag.guardrails import GuardrailError
from advanced_rag.hybrid import HybridConfig
from advanced_rag.observe import EventStore
from advanced_rag.runtime import answer, build_state, openai_generator
from advanced_rag.telemetry import configure_otel, stage
from ragcheck.metrics.retrieval import (
    citation_precision,
    mrr,
    ndcg_at_k,
    page_key,
    precision_at_k,
    recall_at_k,
)

logger = logging.getLogger("advanced_rag.api")
EXEMPT = {"/health", "/ready", "/version"}


@dataclass(frozen=True)
class Settings:
    rate_limit_per_minute: int = 30
    max_body_bytes: int = 32768
    max_query_chars: int = 1000
    cors_origins: tuple[str, ...] = ("http://127.0.0.1:3000",)
    require_citations: bool = True
    log_content: bool = False
    retention_days: int = 14
    event_path: str = ":memory:"
    enable_openai: bool = False
    generation_model: str = "gpt-4.1-mini"
    qdrant_url: str | None = None
    rerank: bool = True

    @classmethod
    def from_env(cls) -> Settings:
        raw = os.environ.get("RAG_CORS_ORIGINS", "http://127.0.0.1:3000")
        origins = tuple(item.strip() for item in raw.split(",") if item.strip() and item.strip() != "*")
        return cls(
            rate_limit_per_minute=int(os.environ.get("RAG_RATE_LIMIT_PER_MINUTE", "30")),
            max_body_bytes=int(os.environ.get("RAG_MAX_BODY_BYTES", "32768")),
            max_query_chars=int(os.environ.get("RAG_MAX_QUERY_CHARS", "1000")),
            cors_origins=origins or ("http://127.0.0.1:3000",),
            require_citations=os.environ.get("RAG_REQUIRE_CITATIONS", "1") not in {"0", "false"},
            log_content=os.environ.get("RAG_LOG_CONTENT", "") in {"1", "true", "TRUE"},
            retention_days=int(os.environ.get("RAG_EVENT_RETENTION_DAYS", "14")),
            event_path=os.environ.get("RAG_EVENT_PATH", ":memory:"),
            enable_openai=os.environ.get("RAG_ENABLE_OPENAI", "") in {"1", "true", "TRUE"},
            generation_model=os.environ.get("RAG_GENERATION_MODEL", "gpt-4.1-mini"),
            qdrant_url=os.environ.get("QDRANT_URL", "").strip() or None,
            rerank=os.environ.get("RAG_RERANK", "1") not in {"0", "false"},
        )


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope.get("method") in {"POST", "PUT"}:
            headers = {key.decode("latin-1").lower(): value.decode("latin-1") for key, value in scope.get("headers", [])}
            length = headers.get("content-length", "")
            if length.isdigit() and int(length) > self.max_bytes:
                response = JSONResponse({"error": "The request is too large."}, status_code=413)
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp, limiter: RateLimiter) -> None:
        self.app = app
        self.limiter = limiter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") in EXEMPT:
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        key = client[0] if client else "unknown"
        allowed, retry = self.limiter.check(key)
        if not allowed:
            response = JSONResponse(
                {"error": "Too many requests."},
                status_code=429,
                headers={"Retry-After": str(retry)},
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = str(uuid.uuid4())
        token = request_id_var.set(request_id)

        async def send_with_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        try:
            with stage("http.request"):
                await self.app(scope, receive, send_with_id)
        finally:
            request_id_var.reset(token)


def _version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("advanced-rag")
    except PackageNotFoundError:
        return "0.1.0"


def _hybrid() -> HybridConfig:
    path = os.environ.get("RAG_HYBRID_CONFIG", "config/hybrid.yaml")
    if os.path.exists(path):
        return HybridConfig.from_yaml(path)
    return HybridConfig()


def _store(settings: Settings):
    if not settings.qdrant_url:
        return None
    from advanced_rag.stores.qdrant import QdrantVectorStore

    return QdrantVectorStore(location=settings.qdrant_url)


def create_app(state=None, settings: Settings | None = None) -> FastAPI:
    chosen = settings or Settings.from_env()
    if "*" in chosen.cors_origins:
        raise ValueError("CORS origins cannot include a wildcard.")
    configure_otel()
    service = state or build_state(
        hybrid=_hybrid(),
        store=_store(chosen),
        events=EventStore(
            path=chosen.event_path,
            retention_days=chosen.retention_days,
            log_content=chosen.log_content,
        ),
        generator=openai_generator(chosen.generation_model) if chosen.enable_openai else None,
        rerank=chosen.rerank,
        require_citations=chosen.require_citations,
        max_query_chars=chosen.max_query_chars,
    )
    app = FastAPI(title="Advanced RAG evaluation API", version=_version(), docs_url=None, redoc_url=None)
    app.state.service = service
    app.state.settings = chosen
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(RateLimitMiddleware, limiter=RateLimiter(chosen.rate_limit_per_minute))
    app.add_middleware(BodyLimitMiddleware, max_bytes=chosen.max_body_bytes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(chosen.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )

    @app.exception_handler(GuardrailError)
    async def rejected(_request: Request, exc: GuardrailError) -> JSONResponse:
        return JSONResponse({"error": str(exc)}, status_code=400)

    @app.exception_handler(RequestValidationError)
    async def invalid(_request: Request, _exc: RequestValidationError) -> JSONResponse:
        return JSONResponse({"error": "The request is not valid."}, status_code=400)

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
        return JSONResponse({"error": detail}, status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(Exception)
    async def failed(_request: Request, exc: Exception) -> JSONResponse:
        logger.warning("request failed: %s", type(exc).__name__)
        return JSONResponse({"error": "The request could not be completed."}, status_code=500)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    def ready() -> JSONResponse:
        report = service.readiness()
        status = 200 if report["ready"] else 503
        return JSONResponse({"status": "ready" if report["ready"] else "not_ready", **report}, status_code=status)

    @app.get("/version")
    def version() -> dict[str, str]:
        return {"name": "advanced-rag", "version": _version()}

    @app.post("/query", response_model=QueryResponseModel)
    def query(body: QueryRequest) -> dict[str, object]:
        payload = answer(service, body.question, body.top_k, body.document_id, body.page)
        return {
            "answer": payload["answer"],
            "citations": payload["citations"],
            "retrieval": payload["retrieval"],
            "generation": payload["generation"],
        }

    @app.post("/retrieve", response_model=RetrieveResponseModel)
    def retrieve_route(body: QueryRequest) -> dict[str, object]:
        payload = answer(service, body.question, body.top_k, body.document_id, body.page)
        return {
            "strategy": payload["retrieval"]["strategy"],  # type: ignore[index]
            "top_k": body.top_k,
            "latency_ms": payload["retrieval"]["latency_ms"],  # type: ignore[index]
            "passages": payload["passages"],
        }

    @app.post("/evaluate")
    def evaluate(body: EvaluateRequest) -> dict[str, float | int]:
        retrieved = [page_key(item.document_id, item.page) for item in body.retrieved]
        relevant = {page_key(item.document_id, item.page) for item in body.relevant}
        cited = [page_key(item.document_id, item.page) for item in body.cited]
        return {
            "k": body.k,
            "recall_at_k": recall_at_k(retrieved, relevant, body.k),
            "precision_at_k": precision_at_k(retrieved, relevant, body.k),
            "mrr": mrr(retrieved, relevant),
            "ndcg": ndcg_at_k(retrieved, relevant, body.k),
            "citation_precision": citation_precision(cited, relevant),
        }

    return app


app = create_app()


def main() -> None:
    import uvicorn

    host = os.environ.get("RAG_HOST", "127.0.0.1")
    port = int(os.environ.get("RAG_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
