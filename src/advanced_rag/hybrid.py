"""Hybrid retrieval: dense candidates, BM25 candidates, then RRF.

Reranking, when enabled, reorders only the fused candidate set. It does not
search the rest of the corpus again. This is separate from the stored FAISS
benchmark, which reranks the dense hits directly.
"""

from __future__ import annotations

from dataclasses import dataclass

import yaml

from advanced_rag.models import Chunk, RetrievedChunk
from advanced_rag.reranking.bm25 import BM25Reranker


@dataclass(frozen=True)
class HybridConfig:
    dense_top_k: int = 20
    bm25_top_k: int = 20
    fusion: str = "rrf"
    rrf_k: int = 60
    final_top_k: int = 5

    def __post_init__(self) -> None:
        if self.fusion != "rrf":
            raise ValueError("fusion must be rrf.")
        for name in ("dense_top_k", "bm25_top_k", "final_top_k", "rrf_k"):
            if getattr(self, name) < 1:
                raise ValueError(f"{name} must be at least 1.")

    @classmethod
    def from_yaml(cls, path: str) -> HybridConfig:
        with open(path, encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
        if not isinstance(data, dict):
            raise ValueError("Hybrid configuration must be a mapping.")
        known = {item.name for item in cls.__dataclass_fields__.values()}
        unknown = sorted(set(data) - known)
        if unknown:
            raise ValueError(f"Unknown hybrid fields: {', '.join(unknown)}.")
        return cls(**data)


def reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    """Fuse ranked id lists. Higher fused score is better. Ties break by id."""

    if k < 1:
        raise ValueError("rrf k must be at least 1.")
    scores: dict[str, float] = {}
    for ranking in rankings:
        for position, item in enumerate(ranking, start=1):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + position)
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))


def bm25_ranking(query: str, chunks: list[Chunk], top_k: int) -> list[str]:
    if not chunks or top_k < 1:
        return []
    return BM25Reranker(chunks).top_ids(query, chunks, top_k)


def fuse_hits(
    query: str,
    dense: list[RetrievedChunk],
    lexical_ids: list[str],
    chunks: list[Chunk],
    config: HybridConfig,
    rerank: bool,
) -> list[RetrievedChunk]:
    by_id = {chunk.chunk_id: chunk for chunk in chunks}
    dense_ids = [hit.chunk_id for hit in dense]
    fused = reciprocal_rank_fusion([dense_ids, lexical_ids], config.rrf_k)
    chosen = [item for item, _score in fused[: config.final_top_k] if item in by_id]
    distance = {hit.chunk_id: hit.distance for hit in dense}
    hits: list[RetrievedChunk] = []
    for rank, chunk_id in enumerate(chosen, start=1):
        chunk = by_id[chunk_id]
        hits.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                page=chunk.page,
                text=chunk.text,
                corpus_index=chunk.corpus_index,
                rank=rank,
                score=float(rank),
                score_type="rrf",
                distance=float(distance.get(chunk_id, 0.0)),
            )
        )
    if rerank and hits:
        hits = BM25Reranker(chunks).rerank(query, hits, config.final_top_k)
    return hits
