"""In-process request counter.

This is an application-level demo limiter. Distributed limiting needs shared state or a gateway.
"""

from __future__ import annotations

import threading
import time


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        if limit < 1:
            raise ValueError("limit must be at least 1.")
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, now: float | None = None) -> tuple[bool, int]:
        moment = time.monotonic() if now is None else now
        with self._lock:
            recent = [stamp for stamp in self._hits.get(key, []) if moment - stamp < self.window_seconds]
            if len(recent) >= self.limit:
                retry = max(1, int(self.window_seconds - (moment - recent[0])) + 1)
                self._hits[key] = recent
                return False, retry
            recent.append(moment)
            self._hits[key] = recent
            return True, 0
