"""Metadata filter comparison for a caller-supplied store.

The result is a measurement of that store. It is not the 40-question benchmark.
"""

from __future__ import annotations

from advanced_rag.stores.base import VectorStore


def compare_document_filter(
    store: VectorStore,
    vector: list[float],
    document_id: str,
    top_k: int = 10,
) -> dict[str, object]:
    unfiltered = store.search(vector, top_k)
    filtered = store.search(vector, top_k, document_id=document_id)
    return {
        "unfiltered_hits": len(unfiltered),
        "filtered_hits": len(filtered),
        "unfiltered_ids": [item[0] for item in unfiltered],
        "filtered_ids": [item[0] for item in filtered],
        "note": "Fixture measurement. This is not the 40-question benchmark.",
    }
