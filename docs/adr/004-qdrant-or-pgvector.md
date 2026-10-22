# Qdrant, with pgvector as the alternative

## Context

The benchmark index is a local FAISS file. A service that restarts needs a store that can filter on document and page.

## Decision

Qdrant is the preferred persistent default, run from Docker Compose or the local manifests. Tests use the client memory mode and do not need a server. pgvector is the alternative when Postgres is already local. It is not implemented as a second benchmark.

## Alternatives considered

A hosted vector service was rejected because it is a paid dependency. Keeping only FAISS files would make metadata filters and restarts more awkward.

## Consequences

The API starts on the memory store when QDRANT_URL is unset. Distance scales differ across stores, so tests check membership and filters rather than equating scores.
