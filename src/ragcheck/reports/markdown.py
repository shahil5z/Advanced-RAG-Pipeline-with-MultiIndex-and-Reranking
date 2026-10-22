"""Write a short Markdown report from experiment JSON."""

from __future__ import annotations

from pathlib import Path


def render_report(results: list[dict], comparison: dict | None = None) -> str:
    lines = ["# Retrieval experiment report", ""]
    counted = [item for item in results if item.get("metrics")]
    if counted:
        lines.append(f"Questions in the dataset: {counted[0].get('questions')}.")
        lines.append("")
        lines.append("| Configuration | Recall | MRR | nDCG | Citation precision | Mean retrieval ms |")
        lines.append("|---|---:|---:|---:|---:|---:|")
        for item in counted:
            metrics = item["metrics"]
            latency = (item.get("latency_ms") or {}).get("mean")
            lines.append(
                "| {name} | {recall:.3f} | {mrr:.3f} | {ndcg:.3f} | {cite:.3f} | {latency:.1f} |".format(
                    name=item["name"],
                    recall=metrics["recall_at_k"],
                    mrr=metrics["mrr"],
                    ndcg=metrics["ndcg"],
                    cite=metrics["citation_precision"],
                    latency=latency or 0,
                )
            )
        lines.append("")
    failed = [item for item in results if not item.get("metrics")]
    if failed:
        lines.append("## Not scored")
        lines.append("")
        for item in failed:
            message = item["errors"][0]["error"] if item.get("errors") else "no metrics"
            lines.append(f"- {item['name']}: {message}")
        lines.append("")
    if comparison:
        lines.append("## Baseline comparison")
        lines.append("")
        lines.append(f"Status: {comparison['status']}")
        lines.append("")
        for row in comparison.get("metrics", []):
            lines.append(
                f"- {row['metric']}: baseline {row['baseline']:.4f}, "
                f"current {row['current']:.4f}, delta {row['delta']:.4f}, {row['status']}"
            )
        for reason in comparison.get("reasons", []):
            lines.append(f"- {reason}")
        lines.append("")
    lines.append("LLM-judge scores are not in this report unless a run stored them.")
    lines.append("Judge scores are model-based and are not ground truth.")
    lines.append("")
    return "\n".join(lines)


def write_report(path: str | Path, results: list[dict], comparison: dict | None = None) -> None:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(render_report(results, comparison), encoding="utf-8")
