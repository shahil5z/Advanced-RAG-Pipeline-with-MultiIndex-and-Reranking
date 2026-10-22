# Public demo boundary

## Context

The site is hosted without the Python service, Qdrant, or a model key. The benchmark numbers are real. The interactive search cannot be that index.

## Decision

Public mode serves prepared benchmark JSON and a small in-browser approximation over six lab notes. The demo is labeled a prepared demonstration. Local engineering mode is FastAPI, Qdrant, traces, and the optional key. The public route is not described as the live benchmark API.

## Alternatives considered

Removing the interactive route would leave only tables. Proxying the browser to a hosted model would require a secret on the public deployment and would mix generation latency into a retrieval demo.

## Consequences

Visitors can try a question. They can also see that the approximation is not FAISS and not the 1,177-chunk index. No key is required to deploy the site.
