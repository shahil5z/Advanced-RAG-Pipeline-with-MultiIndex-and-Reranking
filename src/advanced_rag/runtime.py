"""In-process service corpus and hybrid retrieval.

The embedder is a deterministic hash. It is not the benchmark MiniLM model.
The sample passages are not the 1,177-chunk diabetes benchmark.
"""

from __future__ import annotations

import hashlib
import os
import time
from dataclasses import dataclass, replace
from typing import Callable

from advanced_rag.api_context import request_id_var
from advanced_rag.cost import LABEL, ModelPrice, estimate_cost
from advanced_rag.guardrails import SAFE_FALLBACK, bound_context, check_question, grounded_answer
from advanced_rag.hybrid import HybridConfig, bm25_ranking, fuse_hits
from advanced_rag.models import Chunk, RetrievedChunk
from advanced_rag.observe import EventStore
from advanced_rag.stores.base import VectorStore
from advanced_rag.stores.memory import MemoryVectorStore
from advanced_rag.telemetry import stage

Generator = Callable[[str, list[RetrievedChunk]], tuple[str, str | None, int | None, int | None]]


def hash_embed(text: str, dim: int = 32) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    while len(values) < dim:
        for offset in range(0, len(digest), 4):
            if len(values) >= dim:
                break
            chunk = digest[offset : offset + 4]
            if len(chunk) < 4:
                break
            values.append(int.from_bytes(chunk, "big") / 2**32)
        digest = hashlib.sha256(digest).digest()
    return values


SAMPLE_CHUNKS: list[Chunk] = [
    Chunk(
        "insulin-note:p1:c0",
        "insulin-note",
        1,
        "Insulin lowers blood glucose when the pancreas releases it.",
        0,
        filename="insulin-note.txt",
        section="definition",
    ),
    Chunk(
        "insulin-note:p2:c0",
        "insulin-note",
        2,
        "A basal dose covers background insulin needs overnight.",
        1,
        filename="insulin-note.txt",
        section="dosing",
    ),
    Chunk(
        "railway-note:p1:c0",
        "railway-note",
        1,
        "The night train leaves the station after the signal clears.",
        2,
        filename="railway-note.txt",
        section="timetable",
    ),
]


def _matches(chunk: Chunk, document_id: str | None, page: int | None) -> bool:
    if document_id is not None and chunk.document_id != document_id:
        return False
    if page is not None and chunk.page != page:
        return False
    return True


@dataclass
class ServiceState:
    chunks: list[Chunk]
    store: VectorStore
    hybrid: HybridConfig
    events: EventStore
    rerank: bool = True
    generator: Generator | None = None
    require_citations: bool = True
    max_context_chars: int = 4000
    max_query_chars: int = 1000
    price: ModelPrice | None = None

    def readiness(self) -> dict[str, object]:
        try:
            count = int(self.store.count())
            store_status = "ok" if count > 0 else "empty"
        except Exception:
            count = 0
            store_status = "error"
        retriever = "ok" if self.chunks else "empty"
        configuration = "ok" if self.hybrid.fusion == "rrf" else "invalid"
        ready = store_status == "ok" and retriever == "ok" and configuration == "ok"
        return {
            "ready": ready,
            "vector_store": store_status,
            "chunks": count,
            "retriever": retriever,
            "configuration": configuration,
        }


def build_state(
    hybrid: HybridConfig | None = None,
    store: VectorStore | None = None,
    chunks: list[Chunk] | None = None,
    events: EventStore | None = None,
    generator: Generator | None = None,
    rerank: bool = True,
    require_citations: bool = True,
    max_query_chars: int = 1000,
) -> ServiceState:
    chosen = list(chunks or SAMPLE_CHUNKS)
    chosen.sort(key=lambda chunk: chunk.corpus_index)
    for index, chunk in enumerate(chosen):
        if chunk.corpus_index != index:
            raise ValueError("corpus_index must be the position in the service corpus.")
    target = store or MemoryVectorStore()
    if target.count() == 0:
        target.upsert(chosen, [hash_embed(chunk.text) for chunk in chosen])
    return ServiceState(
        chunks=chosen,
        store=target,
        hybrid=hybrid or HybridConfig(),
        events=events or EventStore(),
        rerank=rerank,
        generator=generator,
        require_citations=require_citations,
        max_query_chars=max_query_chars,
    )


def _dense(
    state: ServiceState,
    vector: list[float],
    top_k: int,
    document_id: str | None,
    page: int | None,
) -> list[RetrievedChunk]:
    by_id = {chunk.chunk_id: chunk for chunk in state.chunks}
    hits: list[RetrievedChunk] = []
    for rank, (chunk_id, distance) in enumerate(
        state.store.search(vector, top_k, document_id=document_id, page=page),
        start=1,
    ):
        chunk = by_id[chunk_id]
        hits.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                page=chunk.page,
                text=chunk.text,
                corpus_index=chunk.corpus_index,
                rank=rank,
                score=float(distance),
                score_type="dense",
                distance=float(distance),
            )
        )
    return hits


def retrieve(
    state: ServiceState,
    question: str,
    top_k: int,
    document_id: str | None = None,
    page: int | None = None,
) -> dict[str, object]:
    started = time.perf_counter()
    with stage("guardrails"):
        cleaned = check_question(question, state.max_query_chars)
    with stage("embedding"):
        vector = hash_embed(cleaned)
    config = replace(state.hybrid, final_top_k=top_k)
    with stage("dense", strategy="dense"):
        dense = _dense(state, vector, config.dense_top_k, document_id, page)
    allowed = {
        chunk.chunk_id
        for chunk in state.chunks
        if _matches(chunk, document_id, page)
    }
    with stage("bm25"):
        lexical = [item for item in bm25_ranking(cleaned, state.chunks, config.bm25_top_k) if item in allowed]
    with stage("fusion", strategy="rrf"):
        fused = fuse_hits(cleaned, dense, lexical, state.chunks, config, rerank=False)
        fused = [hit for hit in fused if hit.chunk_id in allowed]
    rerank_ms = 0.0
    hits = fused
    strategy = "dense+bm25+rrf"
    if state.rerank:
        with stage("rerank"):
            rerank_started = time.perf_counter()
            hits = fuse_hits(cleaned, dense, lexical, state.chunks, config, rerank=True)
            hits = [hit for hit in hits if hit.chunk_id in allowed]
            rerank_ms = (time.perf_counter() - rerank_started) * 1000
        strategy = "dense+bm25+rrf+rerank"
    else:
        with stage("rerank"):
            rerank_ms = 0.0
    latency_ms = (time.perf_counter() - started) * 1000
    return {
        "question": cleaned,
        "strategy": strategy,
        "top_k": top_k,
        "latency_ms": latency_ms,
        "rerank_latency_ms": rerank_ms,
        "hits": hits,
    }


def _extractive(hits: list[RetrievedChunk], required: bool) -> tuple[str, str | None, int | None, int | None]:
    if not hits:
        return SAFE_FALLBACK, None, None, None
    top = hits[0]
    citation = f"{top.document_id} p{top.page}"
    texts = bound_context([hit.text for hit in hits], 4000)
    body = texts[0] if texts else ""
    answer = grounded_answer(f"{body} [{citation}]", [citation], required)
    return answer, None, None, None


def answer(state: ServiceState, question: str, top_k: int, document_id: str | None = None, page: int | None = None) -> dict[str, object]:
    total_started = time.perf_counter()
    found = retrieve(state, question, top_k, document_id, page)
    hits: list[RetrievedChunk] = found["hits"]  # type: ignore[assignment]
    error_type = None
    status = "ok"
    try:
        with stage("generation", model=None, strategy=str(found["strategy"])):
            generation_started = time.perf_counter()
            if not hits:
                text, model, input_tokens, output_tokens = SAFE_FALLBACK, None, None, None
            elif state.generator is not None:
                text, model, input_tokens, output_tokens = state.generator(str(found["question"]), hits)
                citation_ids = [f"{hit.document_id} p{hit.page}" for hit in hits]
                text = grounded_answer(text, citation_ids, state.require_citations)
            else:
                text, model, input_tokens, output_tokens = _extractive(hits, state.require_citations)
            generation_ms = (time.perf_counter() - generation_started) * 1000
    except Exception as exc:
        status = "error"
        error_type = type(exc).__name__
        text, model, input_tokens, output_tokens = SAFE_FALLBACK, None, None, None
        generation_ms = 0.0
        raise
    finally:
        total_ms = (time.perf_counter() - total_started) * 1000
        cost = None
        if state.price is not None and input_tokens is not None and output_tokens is not None:
            cost = estimate_cost(state.price, input_tokens, output_tokens)
        state.events.record(
            {
                "request_id": request_id_var.get() or "local",
                "timestamp": None,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": None
                if input_tokens is None or output_tokens is None
                else input_tokens + output_tokens,
                "estimated_cost": cost,
                "cost_label": LABEL if cost is not None else None,
                "retrieval_latency_ms": found["latency_ms"],
                "rerank_latency_ms": found["rerank_latency_ms"],
                "generation_latency_ms": generation_ms,
                "total_latency_ms": total_ms,
                "status": status,
                "error_type": error_type,
                "question": found["question"],
                "answer": text,
            }
        )
    citations = [
        {
            "chunk_id": hit.chunk_id,
            "document_id": hit.document_id,
            "filename": next(chunk.stored_filename for chunk in state.chunks if chunk.chunk_id == hit.chunk_id),
            "page": hit.page,
            "rank": hit.rank,
        }
        for hit in hits
    ]
    return {
        "answer": text,
        "citations": citations,
        "retrieval": {
            "strategy": found["strategy"],
            "top_k": top_k,
            "latency_ms": found["latency_ms"],
        },
        "generation": {
            "model": model,
            "latency_ms": generation_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        },
        "passages": [
            {
                "chunk_id": hit.chunk_id,
                "document_id": hit.document_id,
                "page": hit.page,
                "rank": hit.rank,
                "score": hit.score,
                "score_type": hit.score_type,
                "text": hit.text,
            }
            for hit in hits
        ],
    }


def openai_generator(model: str) -> Generator | None:
    if os.environ.get("RAG_ENABLE_OPENAI", "").strip() not in {"1", "true", "TRUE"}:
        return None
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        return None

    def generate(question: str, hits: list[RetrievedChunk]) -> tuple[str, str | None, int | None, int | None]:
        from advanced_rag.generation.openai import OpenAIGenerator

        started = OpenAIGenerator(model=model, temperature=0)
        text, input_tokens, output_tokens = started.generate_with_usage(question, hits)
        return text, model, input_tokens, output_tokens

    return generate
