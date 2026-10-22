"""Vector store boundary used by the local service.

The stored benchmark still builds FAISS inside the evaluation runner.
This protocol is the service-facing adapter.
"""

from __future__ import annotations

from typing import Protocol

from advanced_rag.models import Chunk


class VectorStore(Protocol):
    def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None: ...

    def clear(self) -> None: ...

    def search(
        self,
        vector: list[float],
        top_k: int,
        document_id: str | None = None,
        page: int | None = None,
    ) -> list[tuple[str, float]]: ...

    def count(self) -> int: ...
