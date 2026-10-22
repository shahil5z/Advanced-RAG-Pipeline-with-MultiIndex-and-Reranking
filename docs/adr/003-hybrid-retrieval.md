# Hybrid retrieval

## Context

BM25 over dense hits cannot surface a lexical match that dense search never returned.

## Decision

Take a dense list and a BM25 list, fuse them with reciprocal rank fusion, then optionally rerank only that fused set. The widths live in config/hybrid.yaml: dense_top_k, bm25_top_k, fusion rrf, final_top_k.

## Alternatives considered

A weighted sum of L2 distance and BM25 needs a scale that this corpus has not justified. Replacing the stored benchmark with fusion would break the regression file.

## Consequences

The hybrid path is implemented and unit-tested. Scores on the 40-question set are not yet measured and are not copied from the dense benchmark.
