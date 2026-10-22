"""Run retrieval evaluation for one built pipeline."""

from __future__ import annotations

import statistics
from datetime import datetime, timezone

from ragcheck import __version__
from ragcheck.datasets.load import relevant_keys
from ragcheck.metrics.retrieval import (
    citation_precision,
    mrr,
    ndcg_at_k,
    page_key,
    precision_at_k,
    recall_at_k,
)


def evaluate_pipeline(pipeline, rows: list[dict], dataset_id: str) -> dict:
    k = pipeline.config.top_k
    per_question = []
    errors = []
    latencies = []
    for row in rows:
        try:
            chunks, latency = pipeline.retrieve(row["question"])
        except Exception as exc:
            errors.append({"id": row["id"], "error": type(exc).__name__})
            continue
        latencies.append(latency)
        retrieved = [page_key(chunk.document_id, chunk.page) for chunk in chunks]
        relevant = relevant_keys(row)
        per_question.append(
            {
                "id": row["id"],
                "recall_at_k": recall_at_k(retrieved, relevant, k),
                "precision_at_k": precision_at_k(retrieved, relevant, k),
                "mrr": mrr(retrieved, relevant),
                "ndcg": ndcg_at_k(retrieved, relevant, k),
                "citation_precision": citation_precision(retrieved, relevant),
                "retrieval_latency_ms": latency,
            }
        )
    return {
        "package_version": __version__,
        "dataset_id": dataset_id,
        "questions": len(rows),
        "evaluated": len(per_question),
        "k": k,
        "metrics": _mean(per_question),
        "latency_ms": _latency(latencies),
        "errors": errors,
        "per_question": per_question,
        "judge": None,
    }


def _mean(rows: list[dict]) -> dict:
    keys = ("recall_at_k", "precision_at_k", "mrr", "ndcg", "citation_precision")
    if not rows:
        return {key: None for key in keys}
    return {key: sum(row[key] for row in rows) / len(rows) for key in keys}


def _latency(values: list[float]) -> dict:
    if not values:
        return {"mean": None, "p50": None, "p95": None}
    ordered = sorted(values)
    return {
        "mean": statistics.fmean(values),
        "p50": _percentile(ordered, 0.50),
        "p95": _percentile(ordered, 0.95),
    }


def _percentile(ordered: list[float], fraction: float) -> float:
    if len(ordered) == 1:
        return ordered[0]
    index = (len(ordered) - 1) * fraction
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    weight = index - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def stamp(result: dict, name: str, config: dict, seed: int, commit: str | None) -> dict:
    result = dict(result)
    result.update(
        {
            "name": name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "seed": seed,
            "python": _python(),
            "git_commit": commit,
            "configuration": config,
        }
    )
    return result


def _python() -> str:
    import platform

    return platform.python_version()
