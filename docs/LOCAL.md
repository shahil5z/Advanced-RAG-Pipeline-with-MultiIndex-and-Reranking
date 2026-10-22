# Local engineering mode

Public mode is the Next.js site. It does not start this process. Local engineering mode is the API, Qdrant, and the collector on a machine you control.

## API

```bash
pip install -e ".[api,dev]"
python -m uvicorn advanced_rag.api.app:app --host 127.0.0.1 --port 8000
```

GET /health returns `{"status":"ok"}`. GET /ready checks the vector store, the retriever, and configuration. It does not call a model. POST /query and POST /retrieve search the small sample corpus with a hash embedder, not MiniLM.

The sample corpus is three passages. A fixture measurement, not the 40-question benchmark: unfiltered search returned 3 chunks from 2 documents, and a document filter returned 2 chunks from the matching document. See tests/test_platform.py.

## Limits

The rate limiter defaults to 30 requests a minute for each client address. Health, readiness, and version are exempt. A limited response is HTTP 429 with Retry-After.

This is an application-level demo limiter. Distributed limiting needs shared state or a gateway.

These are application-level guardrails, not a comprehensive security or safety system.

CORS defaults to http://127.0.0.1:3000. A wildcard origin is rejected. Request bodies larger than 32,768 bytes are rejected.

Generation reads the key from the process environment only when RAG_ENABLE_OPENAI is set. Do not commit a value.

## Compose

```bash
docker compose up --build
```

The API image installs the service libraries and not the benchmark embedding model. Run the 40-question benchmark from a local checkout, not inside that image.

Services: api, qdrant, otel-collector, jaeger, prometheus. Grafana is optional: `docker compose --profile grafana up`. Jaeger UI is port 16686. Prometheus is port 9090. Traces are local. External model latency is not the same as these local retrieval times.

## Kubernetes

The manifests in k8s/ are a local demonstration for kind, minikube, or k3d.

```bash
kind create cluster
kind load docker-image advanced-rag:local
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/qdrant.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/ingress.yaml
```

Create a Secret yourself if you enable generation. The manifest only references it. Do not put a key in git. The ingress host is rag.local and needs a local ingress controller, which these manifests do not install.

Liveness probes call /health. Readiness probes call /ready. The API container requests 100m CPU and 128Mi memory, and limits 500m CPU and 512Mi memory. Qdrant uses the same budget.

## Load

`python scripts/load_smoke.py --base http://127.0.0.1:8000` hits /health and /retrieve at a small concurrency. Locust can use locustfile.py the same way. Neither script calls a model. Figures from a run belong in docs/load-test.md only after they are measured.

## Cost

`python scripts/cost_experiment.py` prints `not yet run` when the key is unset. It does not invent a bill. The label on a real run is: Estimated OpenAI API cost based on configured model pricing.
