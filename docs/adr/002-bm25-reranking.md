# BM25 reranking

## Context

Dense order and a useful reading order are not the same. The stored Flat run was scored with and without BM25.

## Decision

BM25 reranks the retrieved chunks. On the stored run it preserved Recall@5 at 0.833 and raised MRR from 0.629 to 0.779 and nDCG from 0.670 to 0.784. It is not described as a recall improvement.

## Alternatives considered

A cross-encoder would reorder with a heavier model and a less obvious cost. Leaving the L2 order unchanged hid the ranking gap the metrics already showed.

## Consequences

The no-rerank run fails the MRR and nDCG gate against the Flat baseline. Recall@5 does not move, so a recall-only dashboard would miss the change.
