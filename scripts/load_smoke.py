"""Small local load smoke against /health and /retrieve.

These timings are local service latency. They are not OpenAI generation latency.
The default scale is intentionally small. Do not point it at a paid model endpoint.
"""

from __future__ import annotations

import argparse
import json
import math
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor


def percentile(values: list[float], percent: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.ceil(percent / 100 * len(ordered)) - 1))
    return ordered[index]


def once(url: str, method: str, payload: bytes | None) -> tuple[int, float]:
    request = urllib.request.Request(url, data=payload, method=method)
    if payload is not None:
        request.add_header("Content-Type", "application/json")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
    elapsed = (time.perf_counter() - started) * 1000
    return status, elapsed


def run(url: str, method: str, payload: bytes | None, requests: int, workers: int) -> dict[str, float | int | str]:
    started = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(lambda _index: once(url, method, payload), range(requests)))
    wall = time.perf_counter() - started
    latencies = [item[1] for item in results]
    errors = sum(1 for status, _elapsed in results if status >= 400)
    return {
        "url": url,
        "requests": requests,
        "concurrency": workers,
        "error_rate": errors / requests,
        "rps": requests / wall if wall else 0,
        "p50_ms": percentile(latencies, 50),
        "p95_ms": percentile(latencies, 95),
        "p99_ms": percentile(latencies, 99),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--requests", type=int, default=30)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    body = json.dumps({"question": "How does insulin lower glucose?", "top_k": 3}).encode()
    report = {
        "note": "Local service latency. External model latency is not included.",
        "health": run(args.base.rstrip("/") + "/health", "GET", None, args.requests, args.workers),
        "retrieve": run(args.base.rstrip("/") + "/retrieve", "POST", body, args.requests, args.workers),
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    main()
