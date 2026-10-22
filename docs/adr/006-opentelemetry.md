# OpenTelemetry

## Context

A single latency number does not say whether time went to embedding, search, fusion, or generation.

## Decision

The local API opens spans for the HTTP request, guardrails, embedding, dense search, BM25, fusion, rerank, and generation. Attributes include latency, status, request id, and, when known, model, strategy, and tokens. Export is opt-in through OTEL_EXPORTER_OTLP_ENDPOINT to a local collector, Jaeger, and Prometheus.

## Alternatives considered

A hosted observability vendor was rejected on cost. Printing logs without spans would be harder to compare across requests.

## Consequences

Tests use an in-memory exporter. The API still answers if the collector is down. Spans do not carry the question text or the key.
