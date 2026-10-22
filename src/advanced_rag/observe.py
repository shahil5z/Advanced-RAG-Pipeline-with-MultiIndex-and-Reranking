"""Local request events.

Raw prompts and answers are omitted unless logging content is explicitly enabled.
Keys, authorization headers, and token-like values are never stored.
"""

from __future__ import annotations

import json
import re
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

_BLOCKED_FIELDS = {
    "authorization",
    "api_key",
    "openai_api_key",
    "password",
    "secret",
    "cookie",
}
_TOKEN = re.compile(
    "(" + "sk" + r"\-|" + "AI" + r"za|bearer\s+[A-Za-z0-9._\-]+)",
    re.IGNORECASE,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _clean(value: Any, log_content: bool) -> Any:
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            if str(key).lower() in _BLOCKED_FIELDS:
                continue
            if not log_content and str(key).lower() in {"question", "answer", "prompt", "response", "text"}:
                continue
            kept = _clean(item, log_content)
            if kept is not None:
                cleaned[str(key)] = kept
        return cleaned
    if isinstance(value, list):
        return [item for item in (_clean(item, log_content) for item in value) if item is not None]
    if isinstance(value, str) and _TOKEN.search(value):
        return None
    return value


class EventStore:
    def __init__(self, path: str = ":memory:", retention_days: int = 14, log_content: bool = False) -> None:
        if retention_days < 1:
            raise ValueError("retention_days must be at least 1.")
        self.retention_days = retention_days
        self.log_content = log_content
        self.path = path
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._lock = threading.Lock()
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                request_id TEXT PRIMARY KEY,
                recorded_at TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def record(self, event: dict[str, Any]) -> None:
        safe = _clean(event, self.log_content)
        if not isinstance(safe, dict):
            return
        request_id = str(safe.get("request_id") or "")
        if not request_id:
            raise ValueError("request_id is required.")
        recorded_at = str(safe.get("timestamp") or _utc_now().isoformat())
        safe["timestamp"] = recorded_at
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO events (request_id, recorded_at, payload) VALUES (?, ?, ?)",
                (request_id, recorded_at, json.dumps(safe, sort_keys=True)),
            )
            self._conn.commit()

    def list_events(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload FROM events ORDER BY recorded_at"
            ).fetchall()
        return [json.loads(row[0]) for row in rows]

    def purge(self, now: datetime | None = None) -> int:
        moment = now or _utc_now()
        cutoff = (moment - timedelta(days=self.retention_days)).isoformat()
        with self._lock:
            removed = self._conn.execute("DELETE FROM events WHERE recorded_at < ?", (cutoff,)).rowcount
            self._conn.commit()
        return int(removed)

    def close(self) -> None:
        self._conn.close()
