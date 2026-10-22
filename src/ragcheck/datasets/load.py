"""Load and check the golden question file."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

REQUIRED = ("id", "question", "expected_answer", "relevant")


def load_dataset(path: str | Path) -> tuple[list[dict], str]:
    dataset_path = Path(path)
    if not dataset_path.is_file():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")
    raw = dataset_path.read_text(encoding="utf-8")
    rows = []
    seen: set[str] = set()
    for line_number, line in enumerate(raw.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Line {line_number} is not valid JSON.") from exc
        _validate_row(row, line_number)
        if row["id"] in seen:
            raise ValueError(f"Duplicate question id {row['id']}.")
        seen.add(row["id"])
        rows.append(row)
    if not rows:
        raise ValueError("The dataset is empty.")
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    return rows, digest


def _validate_row(row: dict, line_number: int) -> None:
    missing = [field for field in REQUIRED if field not in row]
    if missing:
        raise ValueError(f"Line {line_number} is missing {', '.join(missing)}.")
    if not str(row["question"]).strip():
        raise ValueError(f"Line {line_number} has an empty question.")
    if not str(row["expected_answer"]).strip():
        raise ValueError(f"Line {line_number} has an empty expected answer.")
    relevant = row["relevant"]
    if not isinstance(relevant, list) or not relevant:
        raise ValueError(f"Line {line_number} needs at least one relevant page.")
    for item in relevant:
        if "document_id" not in item or "page" not in item:
            raise ValueError(f"Line {line_number} has a relevant page without document_id and page.")
        if not isinstance(item["page"], int) or item["page"] < 0:
            raise ValueError(f"Line {line_number} has an invalid page number.")


def relevant_keys(row: dict) -> set[str]:
    from ragcheck.metrics.retrieval import page_key

    return {page_key(item["document_id"], item["page"]) for item in row["relevant"]}
