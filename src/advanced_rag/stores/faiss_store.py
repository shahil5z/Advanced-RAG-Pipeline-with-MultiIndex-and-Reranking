"""FAISS adapter for the service. The benchmark runner keeps its own indexes."""

from __future__ import annotations

from typing import Any

import numpy as np

from advanced_rag.models import Chunk


class FaissVectorStore:
    def __init__(self) -> None:
        self.chunks: list[Chunk] = []
        self._matrix: np.ndarray | None = None
        self._index: Any = None

    def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        import faiss

        if len(chunks) != len(vectors):
            raise ValueError("Chunk and vector counts differ.")
        matrix = np.ascontiguousarray(vectors, dtype="float32")
        if matrix.ndim != 2 or matrix.shape[0] == 0:
            raise ValueError("Cannot build an index from an empty embedding matrix.")
        index = faiss.IndexFlatL2(matrix.shape[1])
        index.add(matrix)
        self.chunks = list(chunks)
        self._matrix = matrix
        self._index = index

    def clear(self) -> None:
        self.chunks = []
        self._matrix = None
        self._index = None

    def count(self) -> int:
        return len(self.chunks)

    def search(
        self,
        vector: list[float],
        top_k: int,
        document_id: str | None = None,
        page: int | None = None,
    ) -> list[tuple[str, float]]:
        if self._index is None or self._matrix is None or top_k < 1:
            return []
        query = np.ascontiguousarray(vector, dtype="float32")
        scored: list[tuple[str, float]] = []
        if document_id is None and page is None:
            distances, indices = self._index.search(query.reshape(1, -1), min(top_k, len(self.chunks)))
            for distance, row in zip(distances[0], indices[0]):
                if int(row) < 0:
                    continue
                scored.append((self.chunks[int(row)].chunk_id, float(distance)))
            return scored
        for chunk, stored in zip(self.chunks, self._matrix):
            if document_id is not None and chunk.document_id != document_id:
                continue
            if page is not None and chunk.page != page:
                continue
            delta = stored - query
            scored.append((chunk.chunk_id, float(np.dot(delta, delta))))
        scored.sort(key=lambda item: (item[1], item[0]))
        return scored[:top_k]
