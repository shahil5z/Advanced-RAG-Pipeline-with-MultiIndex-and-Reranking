# Hybrid retrieval

## Context

BM25 over dense hits cannot surface a lexical match that dense search never returned.

## Decision

Take a dense list and a BM25 list, fuse them with reciprocal rank fusion, then optionally rerank only that fused set. The widths live in config/hybrid.yaml: dense_top_k, bm25_top_k, fusion rrf, final_top_k.

## Alternatives considered

A weighted sum of L2 distance and BM25 needs a scale that this corpus has not justified. Replacing the stored benchmark with fusion would break the regression file.

## Consequences

The hybrid path is implemented and unit-tested. Measured on the 40-question set on 2026-10-22 (scripts/extended_eval.py, results/extended/hybrid.json): dense flat Recall@5 0.833, MRR 0.629, nDCG 0.670; RRF Recall@5 0.858, MRR 0.760, nDCG 0.772; RRF with BM25 rerank Recall@5 0.858, MRR 0.821, nDCG 0.819. The net Recall@5 gain is one question (q11 and q18 recovered, q30 lost). Median local retrieval rose from 6.1 ms to 105.9 ms because BM25 is fitted on every query.
