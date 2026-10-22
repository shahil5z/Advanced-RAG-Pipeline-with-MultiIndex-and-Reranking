"""Brute-force store for tests and the default local service corpus."""

from __future__ import annotations

import math

from advanced_rag.models import Chunk


def _distance(left: list[float], right: list[float]) -> float:
    total = 0.0
    for a, b in zip(left, right):
        delta = a - b
        total += delta * delta
    return math.sqrt(total)


class MemoryVectorStore:
    def __init__(self) -> None:
        self._rows: list[tuple[Chunk, list[float]]] = []

    def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("Chunk and vector counts differ.")
        by_id = {chunk.chunk_id: (chunk, vector) for chunk, vector in self._rows}
        for chunk, vector in zip(chunks, vectors):
            by_id[chunk.chunk_id] = (chunk, vector)
        self._rows = list(by_id.values())

    def clear(self) -> None:
        self._rows.clear()

    def count(self) -> int:
        return len(self._rows)

    def search(
        self,
        vector: list[float],
        top_k: int,
        document_id: str | None = None,
        page: int | None = None,
    ) -> list[tuple[str, float]]:
        matched: list[tuple[str, float]] = []
        for chunk, stored in self._rows:
            if document_id is not None and chunk.document_id != document_id:
                continue
            if page is not None and chunk.page != page:
                continue
            matched.append((chunk.chunk_id, _distance(vector, stored)))
        matched.sort(key=lambda item: (item[1], item[0]))
        return matched[:top_k]
