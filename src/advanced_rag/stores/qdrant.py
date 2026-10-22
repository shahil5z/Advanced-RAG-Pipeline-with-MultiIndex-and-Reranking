"""Qdrant adapter. Tests use the client local mode and do not need a server."""

from __future__ import annotations

from typing import Any

from advanced_rag.models import Chunk


class QdrantVectorStore:
    def __init__(self, location: str = ":memory:", collection: str = "chunks") -> None:
        from qdrant_client import QdrantClient

        self._remote = location.startswith("http://") or location.startswith("https://")
        if self._remote:
            self.client = QdrantClient(url=location, check_compatibility=False)
        else:
            self.client = QdrantClient(location=location, check_compatibility=False)
        self.collection = collection
        self._size: int | None = None

    def upsert(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        from qdrant_client.models import Distance, PointStruct, VectorParams

        if len(chunks) != len(vectors):
            raise ValueError("Chunk and vector counts differ.")
        if not chunks:
            return
        size = len(vectors[0])
        if self._size is None:
            try:
                self.client.create_collection(
                    self.collection,
                    vectors_config=VectorParams(size=size, distance=Distance.EUCLID),
                )
            except Exception:
                if self._remote:
                    raise RuntimeError("Vector store is not reachable.") from None
                raise
            self._size = size
        points = [
            PointStruct(
                id=chunk.corpus_index,
                vector=vector,
                payload={
                    "chunk_id": chunk.chunk_id,
                    "document_id": chunk.document_id,
                    "filename": chunk.stored_filename,
                    "page": chunk.page,
                    "corpus_index": chunk.corpus_index,
                    "section": chunk.section,
                    "text": chunk.text,
                },
            )
            for chunk, vector in zip(chunks, vectors)
        ]
        self.client.upsert(self.collection, points)

    def clear(self) -> None:
        if self._size is None:
            return
        self.client.delete_collection(self.collection)
        self._size = None

    def count(self) -> int:
        if self._size is None:
            return 0
        found = self.client.count(self.collection, exact=True)
        return int(found.count)

    def search(
        self,
        vector: list[float],
        top_k: int,
        document_id: str | None = None,
        page: int | None = None,
    ) -> list[tuple[str, float]]:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        if self._size is None or top_k < 1:
            return []
        must: list[Any] = []
        if document_id is not None:
            must.append(FieldCondition(key="document_id", match=MatchValue(value=document_id)))
        if page is not None:
            must.append(FieldCondition(key="page", match=MatchValue(value=page)))
        query_filter = Filter(must=must) if must else None
        found = self.client.query_points(
            self.collection,
            query=vector,
            limit=top_k,
            query_filter=query_filter,
        ).points
        hits: list[tuple[str, float]] = []
        for point in found:
            payload = point.payload or {}
            chunk_id = payload.get("chunk_id")
            if chunk_id is None:
                continue
            hits.append((str(chunk_id), float(point.score)))
        return hits
