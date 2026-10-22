# FastAPI as the service boundary

## Context

The library can retrieve and score without HTTP. A local engineering mode needs health, readiness, and a place to put limits.

## Decision

FastAPI is a thin boundary over the same package. GET /health returns status ok. GET /ready checks the store, the retriever, and configuration, and does not call a model. POST /query, POST /retrieve, and POST /evaluate are the working routes. Production errors omit stack traces.

## Alternatives considered

Serving the library only through the Next.js route would hide the Python boundary and would still be the public approximation. A second Python package would duplicate the models.

## Consequences

The public site does not run this process. CORS is a configured origin list, not a wildcard. Body size and query length are limited.
