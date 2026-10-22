"""Command line for retrieval evaluation."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from ragcheck.compare import compare, load_result, save_json
from ragcheck.datasets.load import load_dataset
from ragcheck.reports.markdown import write_report
from ragcheck.runners.matrix import run_matrix


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="ragcheck", description="Evaluate retrieval for a local RAG pipeline.")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="Write the default experiment file if it is missing.")
    init.add_argument("--path", default="experiments/default.yaml")

    build = sub.add_parser("build-dataset", help="Check the golden dataset. This command does not invent questions.")
    build.add_argument("--dataset", default="data/golden/diabetes.jsonl")

    run = sub.add_parser("run", help="Run the experiment matrix and write JSON.")
    run.add_argument("--config", default="config.example.yaml")
    run.add_argument("--matrix", default="experiments/default.yaml")
    run.add_argument("--output", default="results/experiments/latest.json")
    run.add_argument("--report", default="results/reports/latest.md")

    compared = sub.add_parser("compare", help="Compare a result JSON file with the baseline.")
    compared.add_argument("--current", required=True)
    compared.add_argument("--baseline", default="results/baseline.json")
    compared.add_argument("--thresholds", default=None)
    compared.add_argument("--name", default=None, help="Experiment name when --current is a matrix list.")

    ci = sub.add_parser("ci", help="Exit with status 1 when a metric drops past its threshold.")
    ci.add_argument("--current", required=True)
    ci.add_argument("--baseline", default="results/baseline.json")
    ci.add_argument("--thresholds", default=None)
    ci.add_argument("--name", default=None, help="Experiment name when --current is a matrix list.")

    args = parser.parse_args(argv)
    if args.command == "init":
        return _init(Path(args.path))
    if args.command == "build-dataset":
        return _build_dataset(args.dataset)
    if args.command == "run":
        return _run(args)
    report = _comparison(args.current, args.baseline, args.thresholds, args.name)
    _print_comparison(report)
    if args.command == "ci" and report["status"] != "PASS":
        return 1
    return 0


def _init(path: Path) -> int:
    if path.exists():
        print(f"{path} already exists.")
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_DEFAULT_MATRIX, encoding="utf-8")
    print(f"Wrote {path}.")
    return 0


def _build_dataset(path: str) -> int:
    rows, digest = load_dataset(path)
    print(f"{len(rows)} questions, dataset id {digest}.")
    print("Questions were reviewed from the diabetes report. This command does not generate new ones.")
    return 0


def _run(args) -> int:
    from advanced_rag.config import load_config

    results = run_matrix(args.matrix, load_config(args.config))
    save_json(args.output, results)
    write_report(args.report, results)
    scored = [item["name"] for item in results if item.get("metrics")]
    print(f"Wrote {args.output}. Scored: {', '.join(scored) or 'none'}.")
    return 0


def _comparison(current: str, baseline: str, thresholds: str | None, name: str | None) -> dict:
    limits = None
    if thresholds:
        limits = json.loads(Path(thresholds).read_text(encoding="utf-8"))
    return compare(_select(load_result(current), name), load_result(baseline), limits)


def _select(payload, name: str | None) -> dict:
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, list):
        raise SystemExit("The result file must be one experiment or a list of experiments.")
    if not name:
        names = ", ".join(str(item.get("name")) for item in payload if isinstance(item, dict))
        raise SystemExit(f"The result file has several experiments. Pass --name. Choices: {names}")
    for item in payload:
        if isinstance(item, dict) and item.get("name") == name:
            return item
    raise SystemExit(f"No experiment named {name}.")


def _print_comparison(report: dict) -> None:
    print(report["status"])
    for row in report["metrics"]:
        print(
            f"{row['metric']}: baseline {row['baseline']:.4f}, "
            f"current {row['current']:.4f}, delta {row['delta']:.4f}, {row['status']}"
        )
    for reason in report["reasons"]:
        print(reason)


_DEFAULT_MATRIX = """dataset: data/golden/diabetes.jsonl
experiments:
  - name: flat_baseline
    index_type: flat
    chunk_size: 1000
    chunk_overlap: 200
    top_k: 5
    reranking: true
  - name: flat_no_rerank
    index_type: flat
    chunk_size: 1000
    chunk_overlap: 200
    top_k: 5
    reranking: false
  - name: hnsw
    index_type: hnsw
    chunk_size: 1000
    chunk_overlap: 200
    top_k: 5
    reranking: true
  - name: ivf
    index_type: ivf
    chunk_size: 1000
    chunk_overlap: 200
    top_k: 5
    reranking: true
"""


if __name__ == "__main__":
    sys.exit(main())
