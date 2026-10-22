FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    RAG_HOST=0.0.0.0 \
    RAG_ENABLE_OPENAI=0

COPY pyproject.toml README.md LICENSE ./
COPY src ./src
COPY config ./config
# The service uses a hash embedder. The benchmark embedding library is not
# installed in this image, so the build does not download a GPU stack.
RUN pip install --no-cache-dir --no-deps . \
 && pip install --no-cache-dir \
    "fastapi>=0.115" \
    "httpx>=0.27" \
    "uvicorn>=0.32" \
    "opentelemetry-api>=1.27" \
    "opentelemetry-sdk>=1.27" \
    "opentelemetry-exporter-otlp-proto-grpc>=1.27" \
    "qdrant-client>=1.12" \
    "faiss-cpu>=1.8" \
    "numpy>=1.26" \
    "pymupdf>=1.24,<2" \
    "pyyaml>=6" \
    "rank-bm25>=0.2.2" \
    "langchain-text-splitters>=0.3"

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "advanced_rag.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
