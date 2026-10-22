"""Spans for the local service.

No collector is required. When OTEL_EXPORTER_OTLP_ENDPOINT is unset, spans
stay in the process default tracer.
"""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from typing import Iterator

from opentelemetry import trace

from advanced_rag.api_context import request_id_var


def configure_otel() -> None:
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    if not endpoint:
        return
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    provider = TracerProvider(resource=Resource.create({"service.name": "advanced-rag"}))
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True, timeout=2))
    )
    trace.set_tracer_provider(provider)


@contextmanager
def stage(name: str, **attributes: object) -> Iterator[trace.Span]:
    tracer = trace.get_tracer("advanced_rag")
    with tracer.start_as_current_span(name) as span:
        request_id = request_id_var.get()
        if request_id:
            span.set_attribute("request_id", request_id)
        for key, value in attributes.items():
            if isinstance(value, (str, int, float, bool)):
                span.set_attribute(key, value)
        started = time.perf_counter()
        try:
            yield span
            span.set_attribute("status", "ok")
        except Exception:
            span.set_attribute("status", "error")
            raise
        finally:
            elapsed = (time.perf_counter() - started) * 1000
            span.set_attribute("latency_ms", elapsed)
