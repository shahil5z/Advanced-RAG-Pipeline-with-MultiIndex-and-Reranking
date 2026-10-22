# FAISS for local benchmarking

## Context

The stored comparison uses Flat, HNSW, and IVF on 1,177 vectors. The regression gate compares later runs with that file.

## Decision

Keep FAISS as the benchmark index. The service may also use an in-memory store or Qdrant. Those adapters do not replace the stored numbers.

## Alternatives considered

A single approximate index would have removed the Flat baseline. A hosted vector database would have added a paid dependency.

## Consequences

Flat remains the exact reference. IVF stays undertrained at nlist 100, and the warning stays visible. HNSW can still differ across FAISS builds.
