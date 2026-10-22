"""Estimated generation cost from operator-configured prices.

Retrieval metrics are not computed here. This module does not call OpenAI
unless run_cost_experiment is invoked with a client and a key in the environment.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from statistics import median
from typing import Any

import yaml

LABEL = "Estimated OpenAI API cost based on configured model pricing."


@dataclass(frozen=True)
class ModelPrice:
    model: str
    input_per_million_usd: float
    output_per_million_usd: float


def load_prices(path: str) -> list[ModelPrice]:
    with open(path, encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    rows = data.get("models") if isinstance(data, dict) else None
    if not isinstance(rows, list) or not rows:
        raise ValueError("Model configuration needs a models list.")
    prices: list[ModelPrice] = []
    for row in rows:
        prices.append(
            ModelPrice(
                model=str(row["name"]),
                input_per_million_usd=float(row["input_per_million_usd"]),
                output_per_million_usd=float(row["output_per_million_usd"]),
            )
        )
    return prices


def estimate_cost(price: ModelPrice, input_tokens: int, output_tokens: int) -> float:
    if input_tokens < 0 or output_tokens < 0:
        raise ValueError("Token counts cannot be negative.")
    return (
        input_tokens * price.input_per_million_usd + output_tokens * price.output_per_million_usd
    ) / 1_000_000


def percentile(values: list[float], percent: float) -> float:
    if not values:
        raise ValueError("No values to summarize.")
    if percent <= 0 or percent > 100:
        raise ValueError("percent must be in (0, 100].")
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.ceil(percent / 100 * len(ordered)) - 1))
    return float(ordered[index])


def summarize_generation(
    price: ModelPrice,
    latencies_ms: list[float],
    input_tokens: list[int],
    output_tokens: list[int],
) -> dict[str, float | int | str]:
    if not (len(latencies_ms) == len(input_tokens) == len(output_tokens)):
        raise ValueError("Latency and token lists must be the same length.")
    if not latencies_ms:
        raise ValueError("No generation samples.")
    costs = [
        estimate_cost(price, incoming, outgoing)
        for incoming, outgoing in zip(input_tokens, output_tokens)
    ]
    queries = len(latencies_ms)
    return {
        "label": LABEL,
        "model": price.model,
        "queries": queries,
        "median_latency_ms": float(median(latencies_ms)),
        "p95_latency_ms": percentile(latencies_ms, 95),
        "avg_input_tokens": sum(input_tokens) / queries,
        "avg_output_tokens": sum(output_tokens) / queries,
        "estimated_cost_per_query_usd": sum(costs) / queries,
    }


def available_model_ids(client: Any) -> set[str]:
    listing = client.models.list()
    data = getattr(listing, "data", listing)
    found: set[str] = set()
    for item in data:
        name = getattr(item, "id", None) or (item.get("id") if isinstance(item, dict) else None)
        if name:
            found.add(str(name))
    return found


def validate_models(requested: list[str], available: set[str]) -> list[str]:
    missing = [name for name in requested if name not in available]
    if missing:
        raise ValueError("Models not available on this account: " + ", ".join(missing))
    return list(requested)


def run_cost_experiment(prices: list[ModelPrice], client: object | None) -> dict[str, str]:
    """Refuse unless the operator supplied a key and a client.

    This function does not invent measurements. A real run belongs in the
    operator's environment. Tests pass a fake client.
    """

    if not os.environ.get("OPENAI_API_KEY", "").strip():
        raise RuntimeError("OPENAI_API_KEY is not set. The cost experiment was not run.")
    if client is None:
        raise RuntimeError("A model client is required. The cost experiment was not run.")
    validate_models([price.model for price in prices], available_model_ids(client))
    return {"status": "validated", "label": LABEL}
