"""Search a FAISS index and attach the original chunk records.

The integer returned by FAISS is the row used when the index was built.
That row is the chunk's corpus index.
"""

from __future__ import annotations

import numpy as np

from advanced_rag.models import Chunk, RetrievedChunk


def search(
    index,
    query_vector: np.ndarray,
    chunks: list[Chunk],
    top_k: int,
) -> list[RetrievedChunk]:
    if not chunks:
        return []
    k = min(top_k, len(chunks))
    query = np.ascontiguousarray(query_vector, dtype="float32").reshape(1, -1)
    distances, indices = index.search(query, k)
    found: list[RetrievedChunk] = []
    for position, (distance, row) in enumerate(zip(distances[0], indices[0]), start=1):
        row_number = int(row)
        if row_number < 0:
            continue
        if row_number >= len(chunks):
            raise RuntimeError(
                f"FAISS returned row {row_number}, which is outside the chunk list."
            )
        chunk = chunks[row_number]
        found.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                page=chunk.page,
                text=chunk.text,
                corpus_index=chunk.corpus_index,
                rank=position,
                score=float(distance),
                score_type="l2_distance",
                distance=float(distance),
            )
        )
    return found
