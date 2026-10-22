"""Compare a run with a stored baseline.

A metric fails when it drops by more than its absolute threshold.
Latency is reported and is not a failure by default: one machine is too noisy
for a fixed latency gate. Set a latency_ratio threshold to enable it.
"""

from __future__ import annotations

import json
from pathlib import Path

DEFAULT_THRESHOLDS = {
    "recall_at_k": 0.05,
    "precision_at_k": 0.05,
    "mrr": 0.05,
    "ndcg": 0.05,
    "citation_precision": 0.05,
}


def load_result(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def compare(current: dict, baseline: dict, thresholds: dict | None = None) -> dict:
    limits = dict(DEFAULT_THRESHOLDS)
    if thresholds:
        limits.update(thresholds)
    rows = []
    failed = False
    reasons = []
    current_metrics = current.get("metrics") or {}
    baseline_metrics = baseline.get("metrics") or {}
    if not current_metrics or not baseline_metrics:
        return {
            "status": "FAIL",
            "reasons": ["One of the runs has no metrics."],
            "metrics": [],
        }
    for name, limit in limits.items():
        if name not in baseline_metrics or name not in current_metrics:
            continue
        before = baseline_metrics[name]
        after = current_metrics[name]
        if before is None or after is None:
            continue
        delta = after - before
        status = "PASS"
        if name == "latency_ratio":
            continue
        if delta < -abs(float(limit)):
            status = "FAIL"
            failed = True
            reasons.append(f"{name} dropped by more than {limit}.")
        rows.append(
            {
                "metric": name,
                "baseline": before,
                "current": after,
                "delta": delta,
                "threshold": limit,
                "status": status,
            }
        )
    latency_limit = limits.get("latency_ratio")
    if latency_limit is not None:
        before = (baseline.get("latency_ms") or {}).get("mean")
        after = (current.get("latency_ms") or {}).get("mean")
        if before and after:
            ratio = after / before
            status = "FAIL" if ratio > float(latency_limit) else "PASS"
            if status == "FAIL":
                failed = True
                reasons.append(f"Mean retrieval latency exceeded {latency_limit} times the baseline.")
            rows.append(
                {
                    "metric": "retrieval_latency_mean_ms",
                    "baseline": before,
                    "current": after,
                    "delta": after - before,
                    "threshold": latency_limit,
                    "status": status,
                }
            )
    return {
        "status": "FAIL" if failed else "PASS",
        "reasons": reasons,
        "metrics": rows,
    }


def save_json(path: str | Path, payload: dict | list) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2), encoding="utf-8")
