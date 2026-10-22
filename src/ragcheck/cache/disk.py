"""JSON cache for LLM-judge calls.

The key covers the rubric version, model, question, answer, and context text.
A change to any of those fields misses the cache.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


def cache_key(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


class JsonCache:
    def __init__(self, directory: str | Path) -> None:
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)

    def get(self, key: str) -> dict | None:
        path = self.directory / f"{key}.json"
        if not path.is_file():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def put(self, key: str, value: dict) -> None:
        path = self.directory / f"{key}.json"
        path.write_text(json.dumps(value, indent=2), encoding="utf-8")
