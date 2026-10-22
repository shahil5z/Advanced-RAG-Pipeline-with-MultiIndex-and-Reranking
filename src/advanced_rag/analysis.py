"""Failure notes for the flat_baseline configuration.

Page-level recall comes from the stored benchmark. Retrieved pages come from
the extended rerun in results/extended/hybrid.json, which reproduces the stored
flat_baseline metrics with the same settings. A fine-grained cause is assigned
from those pages with fixed rules, not by a model.
"""

from __future__ import annotations

import json
from pathlib import Path

BASELINE_RUN = "dense_flat_bm25_rerank"
HYBRID_RUN = "hybrid_rrf_bm25_rerank"
BM25_RUN = "bm25_only"

CAUSES = {
    "lexical_mismatch": (
        "Dense search ranked the labelled page outside the top 5, while BM25 alone and "
        "hybrid RRF both retrieved it. The question shares exact terms with the page that "
        "the embedding did not weight.",
        "Use hybrid retrieval (dense + BM25 fused with RRF). On this question it recovers the page.",
    ),
    "multi_page_partial": (
        "The answer is labelled on more than one page. Retrieval found at least one labelled "
        "page and missed the others, and the remaining slots went to pages that repeat the same facts.",
        "Widen K or deduplicate near-identical pages before the final top 5.",
    ),
    "adjacent_page": (
        "A retrieved page sits next to the labelled page. The facts cross a page or chunk "
        "boundary, so the neighbouring chunk ranked higher.",
        "Chunk across page breaks with page ranges in metadata, or count adjacent pages in review.",
    ),
    "same_document_distractor": (
        "All retrieved pages come from the right report, but from sections that discuss the "
        "same topic in other words. Neither dense, BM25, nor hybrid retrieval reached the labelled page.",
        "Add a cross-encoder or LLM rerank over a wider candidate set, or tag section headings in metadata.",
    ),
    "wrong_document": (
        "The retrieved pages come from the distractor document.",
        "Apply a document filter before ranking.",
    ),
}


def classify(expected: list[dict], retrieved: list[dict], recall: float,
             recovered_by_hybrid: bool) -> str:
    wanted = {(item["document_id"], item["page"]) for item in expected}
    docs = {item["document_id"] for item in expected}
    if retrieved and all(item["document_id"] not in docs for item in retrieved):
        return "wrong_document"
    if recovered_by_hybrid:
        return "lexical_mismatch"
    if recall > 0 and len(wanted) > 1:
        return "multi_page_partial"
    for item in retrieved:
        for doc, page in wanted:
            if item["document_id"] == doc and abs(item["page"] - page) == 1:
                return "adjacent_page"
    return "same_document_distractor"


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


def _per_question(payload: dict, name: str) -> dict[str, dict]:
    return {row["id"]: row for row in payload["per_question"][name]}


def build_failure_report(
    golden_path: str = "data/golden/diabetes.jsonl",
    experiment_path: str = "results/experiments/latest.json",
    experiment_name: str = "flat_baseline",
    retrieved_path: str = "results/extended/hybrid.json",
) -> dict:
    golden = _load_golden(Path(golden_path))
    experiment = _experiment(_load_json(Path(experiment_path)), experiment_name)
    rerun = _load_json(Path(retrieved_path))
    assert isinstance(rerun, dict)
    base = _per_question(rerun, BASELINE_RUN)
    hybrid = _per_question(rerun, HYBRID_RUN)
    bm25 = _per_question(rerun, BM25_RUN)
    failures: list[dict] = []
    for row in experiment.get("per_question", []):
        recall = float(row["recall_at_k"])
        if recall >= 1:
            continue
        question = golden[row["id"]]
        category = "retrieval_miss" if recall == 0 else "partial_page_coverage"
        expected = [
            {"document_id": item["document_id"], "page": item["page"]}
            for item in question["relevant"]
        ]
        retrieved = [
            {"document_id": item["document_id"], "page": item["page"]}
            for item in base[row["id"]]["retrieved"]
        ]
        hybrid_recall = float(hybrid[row["id"]]["recall_at_k"])
        cause = classify(expected, retrieved, recall, hybrid_recall > recall)
        text, mitigation = CAUSES[cause]
        failures.append(
            {
                "id": row["id"],
                "question": question["question"],
                "expected_pages": expected,
                "retrieved_pages": retrieved,
                "recall_at_k": recall,
                "mrr": float(row["mrr"]),
                "ndcg": float(row["ndcg"]),
                "hybrid_recall_at_k": hybrid_recall,
                "bm25_recall_at_k": float(bm25[row["id"]]["recall_at_k"]),
                "category": category,
                "fine_cause": cause,
                "likely_cause": text,
                "mitigation": mitigation,
                "evidence": (
                    f"Retrieved pages from the {rerun['measured_at'][:10]} rerun of flat_baseline "
                    "settings, which matches the stored Recall@5, MRR and nDCG."
                ),
            }
        )
    counts: dict[str, int] = {}
    for item in failures:
        counts[item["fine_cause"]] = counts.get(item["fine_cause"], 0) + 1
    return {
        "experiment": experiment_name,
        "questions": int(experiment["questions"]),
        "measured_at": rerun["measured_at"],
        "failures": failures,
        "retrieval_misses": sum(1 for item in failures if item["category"] == "retrieval_miss"),
        "partial_page_coverage": sum(1 for item in failures if item["category"] == "partial_page_coverage"),
        "fine_causes": dict(sorted(counts.items())),
        "note": (
            "Retrieved pages were stored on a rerun with the flat_baseline settings. "
            "Each miss has a fine-grained cause assigned by fixed rules from those pages."
        ),
    }


def _pages(items: list[dict]) -> str:
    return ", ".join(f"{page['document_id']} p{page['page']}" for page in items)


def write_failure_markdown(report: dict, path: str) -> None:
    lines = [
        "# Failure analysis",
        "",
        "Source: stored `flat_baseline` metrics on the 40 reviewed questions, with retrieved",
        f"pages from a rerun of the same settings on {report['measured_at'][:10]}.",
        "",
        report["note"],
        "",
        f"Questions: {report['questions']}.",
        f"Recall below 1: {len(report['failures'])}.",
        f"Recall 0 (`retrieval_miss`): {report['retrieval_misses']}.",
        f"Partial recall (`partial_page_coverage`): {report['partial_page_coverage']}.",
        "",
        "Fine-grained causes:",
        "",
    ]
    lines.extend(f"- `{name}`: {count}" for name, count in report["fine_causes"].items())
    lines.append("")
    for item in report["failures"]:
        lines.extend(
            [
                f"## {item['id']}",
                "",
                f"Question: {item['question']}",
                "",
                f"Expected pages: {_pages(item['expected_pages'])}.",
                "",
                f"Retrieved pages: {_pages(item['retrieved_pages'])}.",
                "",
                f"Category: `{item['category']}`. Cause: `{item['fine_cause']}`. "
                f"Recall@5 {item['recall_at_k']:.3f}, hybrid {item['hybrid_recall_at_k']:.3f}.",
                "",
                f"Likely cause: {item['likely_cause']}",
                "",
                f"Mitigation: {item['mitigation']}",
                "",
            ]
        )
    Path(path).write_text("\n".join(lines), encoding="utf-8")
