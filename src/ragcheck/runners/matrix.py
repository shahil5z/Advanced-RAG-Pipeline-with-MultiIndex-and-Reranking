"""Run a small explicit experiment matrix.

Embeddings are computed once for each chunking and model pair. Index build
time is not included in retrieval latency.
"""

from __future__ import annotations

import subprocess  # nosec B404
from pathlib import Path

import numpy as np
import yaml

from advanced_rag.chunking import chunk_pages
from advanced_rag.config import RAGConfig
from advanced_rag.embeddings import SentenceTransformerEmbedder
from advanced_rag.indexes import build_faiss_index
from advanced_rag.ingestion import load_pdfs
from advanced_rag.pipeline import RAGPipeline
from advanced_rag.reranking import BM25Reranker
from ragcheck.datasets.load import load_dataset
from ragcheck.runners.evaluate import evaluate_pipeline, stamp


def load_matrix(path: str | Path) -> dict:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "experiments" not in data:
        raise ValueError("The matrix file needs an experiments list.")
    return data


def run_matrix(path: str | Path, base_config: RAGConfig) -> list[dict]:
    spec = load_matrix(path)
    # Local JSONL loader, not a model download.
    rows, dataset_id = load_dataset(spec["dataset"])  # nosec B615
    pages = load_pdfs(base_config.input_paths)
    commit = _commit()
    embedders: dict[str, SentenceTransformerEmbedder] = {}
    prepared: dict[tuple, tuple] = {}
    results = []
    for experiment in spec["experiments"]:
        name = experiment["name"]
        config = RAGConfig.from_dict({**base_config.to_dict(), **_overrides(experiment)})
        try:
            chunks, vectors = _prepare(
                pages, config, embedders, prepared
            )
            index = build_faiss_index(vectors, config)
            reranker = BM25Reranker(chunks) if config.reranking else None
            pipeline = RAGPipeline(config, generator=_SilentGenerator())
            pipeline.bind(chunks, index, reranker)
            result = evaluate_pipeline(pipeline, rows, dataset_id)
            results.append(stamp(result, name, config.to_dict(), config.seed, commit))
        except Exception as exc:
            results.append(
                stamp(
                    {
                        "package_version": "0.1.0",
                        "dataset_id": dataset_id,
                        "questions": len(rows),
                        "evaluated": 0,
                        "k": config.top_k,
                        "metrics": None,
                        "latency_ms": None,
                        "errors": [{"id": name, "error": str(exc).splitlines()[0]}],
                        "per_question": [],
                        "judge": None,
                    },
                    name,
                    config.to_dict(),
                    config.seed,
                    commit,
                )
            )
    return results


def _prepare(pages, config: RAGConfig, embedders, prepared):
    key = (config.embedding_model, config.chunk_size, config.chunk_overlap, config.seed)
    if key in prepared:
        return prepared[key]
    chunks = chunk_pages(pages, config.chunk_size, config.chunk_overlap)
    embedder = embedders.get(config.embedding_model)
    if embedder is None:
        embedder = SentenceTransformerEmbedder(config.embedding_model)
        embedders[config.embedding_model] = embedder
    vectors = np.asarray(
        embedder.embed_documents([chunk.text for chunk in chunks]),
        dtype="float32",
    )
    prepared[key] = (chunks, vectors)
    return prepared[key]


def _overrides(experiment: dict) -> dict:
    allowed = {
        "embedding_model",
        "chunk_size",
        "chunk_overlap",
        "index_type",
        "top_k",
        "reranking",
        "generation_model",
        "temperature",
        "seed",
        "hnsw_m",
        "hnsw_ef_construction",
        "ivf_nlist",
        "ivf_nprobe",
    }
    return {key: value for key, value in experiment.items() if key in allowed}


def _commit() -> str | None:
    try:
        completed = subprocess.run(  # nosec B603 B607
            ["git", "rev-parse", "--short", "HEAD"],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        return None
    if completed.returncode != 0:
        return None
    return completed.stdout.strip() or None


class _SilentGenerator:
    def generate(self, query: str, contexts) -> str:
        raise RuntimeError("This run is retrieval-only.")
