"""Failure notes from the stored benchmark.

The stored run kept page-level metrics and did not keep retrieved pages.
Categories that need those pages are not assigned.
"""

from __future__ import annotations

import json
from pathlib import Path

CAUSE = (
    "The stored flat_baseline run recorded page-level metrics for this question "
    "but did not record retrieved pages. A finer cause (semantic miss, lexical "
    "mismatch, wrong document, wrong page, chunk boundary, distractor, or metadata "
    "filter) cannot be assigned without that evidence."
)
MITIGATION = (
    "Persist retrieved document ids and pages on the next evaluation run, then "
    "classify the miss from the stored pages."
)


def _load_json(path: Path) -> object:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _load_golden(path: Path) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            rows[row["id"]] = row
    return rows


def _experiment(payload: object, name: str) -> dict:
    if isinstance(payload, dict):
        experiments = payload.get("experiments", [payload])
    elif isinstance(payload, list):
        experiments = payload
    else:
        raise ValueError("Experiment file is not a list or object.")
    for item in experiments:
        if isinstance(item, dict) and item.get("name") == name:
            return item
    raise ValueError(f"Experiment {name} was not found.")


def build_failure_report(
    golden_path: str = "data/golden/diabetes.jsonl",
    experiment_path: str = "results/experiments/latest.json",
    experiment_name: str = "flat_baseline",
) -> dict:
    golden = _load_golden(Path(golden_path))
    experiment = _experiment(_load_json(Path(experiment_path)), experiment_name)
    failures: list[dict] = []
    for row in experiment.get("per_question", []):
        recall = float(row["recall_at_k"])
        if recall >= 1:
            continue
        question = golden[row["id"]]
        if recall == 0:
            category = "retrieval_miss"
        elif recall > 0:
            category = "partial_page_coverage"
        else:
            continue
        failures.append(
            {
                "id": row["id"],
                "question": question["question"],
                "expected_pages": [
                    {"document_id": item["document_id"], "page": item["page"]}
                    for item in question["relevant"]
                ],
                "retrieved_pages": None,
                "recall_at_k": recall,
                "mrr": float(row["mrr"]),
                "ndcg": float(row["ndcg"]),
                "category": category,
                "likely_cause": CAUSE,
                "mitigation": MITIGATION,
                "evidence": "flat_baseline page-level metrics only. Retrieved pages were not stored.",
            }
        )
    return {
        "experiment": experiment_name,
        "questions": int(experiment["questions"]),
        "failures": failures,
        "retrieval_misses": sum(1 for item in failures if item["category"] == "retrieval_miss"),
        "partial_page_coverage": sum(1 for item in failures if item["category"] == "partial_page_coverage"),
        "note": (
            "Retrieved pages were not stored, so semantic, lexical, document, page, "
            "boundary, distractor, and filter categories were not assigned."
        ),
    }


def write_failure_markdown(report: dict, path: str) -> None:
    lines = [
        "# Failure analysis",
        "",
        "Source: stored `flat_baseline` metrics on the 40 reviewed questions.",
        "Retrieved pages were not stored with that run. The notes below use only the recorded recall.",
        "",
        report["note"],
        "",
        f"Questions: {report['questions']}.",
        f"Recall below 1: {len(report['failures'])}.",
        f"Recall 0 (`retrieval_miss`): {report['retrieval_misses']}.",
        f"Partial recall (`partial_page_coverage`): {report['partial_page_coverage']}.",
        "",
        "These categories are not semantic or lexical judgments. They only say whether the page-level recall was zero or partial.",
        "",
    ]
    for item in report["failures"]:
        expected = ", ".join(
            f"{page['document_id']} p{page['page']}" for page in item["expected_pages"]
        )
        lines.extend(
            [
                f"## {item['id']}",
                "",
                f"Question: {item['question']}",
                "",
                f"Expected pages: {expected}.",
                "",
                "Retrieved pages: not stored.",
                "",
                f"Category: `{item['category']}`. Recall@5 {item['recall_at_k']}.",
                "",
                f"Likely cause: {item['likely_cause']}",
                "",
                f"Mitigation: {item['mitigation']}",
                "",
            ]
        )
    Path(path).write_text("\n".join(lines), encoding="utf-8")
