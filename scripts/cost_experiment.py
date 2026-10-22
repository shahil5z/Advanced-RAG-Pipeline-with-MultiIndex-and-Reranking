"""Generation cost experiment.

Prints "not yet run" when OPENAI_API_KEY is unset. It does not invent numbers.
Estimated OpenAI API cost based on configured model pricing.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from advanced_rag.cost import (
    LABEL,
    available_model_ids,
    load_prices,
    summarize_generation,
    validate_models,
)

QUESTIONS = (
    "How does the executive summary define diabetes?",
    "How many adults were estimated to be living with diabetes in 2014?",
)


def main() -> int:
    print(LABEL)
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        print("not yet run")
        return 0
    prices = load_prices(os.environ.get("RAG_MODEL_CONFIG", "config/models.yaml"))
    try:
        from openai import OpenAI
    except ImportError:
        print("The OpenAI SDK is not installed. The cost experiment was not run.")
        return 1
    client = OpenAI()
    try:
        validate_models([item.model for item in prices], available_model_ids(client))
    except ValueError as exc:
        print(str(exc))
        return 1
    cache = Path(os.environ.get("RAG_COST_CACHE", "results/cache/cost.json"))
    reports = []
    for price in prices:
        latencies: list[float] = []
        incoming: list[int] = []
        outgoing: list[int] = []
        for question in QUESTIONS:
            started = time.perf_counter()
            response = client.chat.completions.create(
                model=price.model,
                temperature=0,
                messages=[{"role": "user", "content": question}],
            )
            latencies.append((time.perf_counter() - started) * 1000)
            usage = response.usage
            incoming.append(int(getattr(usage, "prompt_tokens", 0) or 0))
            outgoing.append(int(getattr(usage, "completion_tokens", 0) or 0))
        reports.append(summarize_generation(price, latencies, incoming, outgoing))
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({"label": LABEL, "reports": reports}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(reports, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
