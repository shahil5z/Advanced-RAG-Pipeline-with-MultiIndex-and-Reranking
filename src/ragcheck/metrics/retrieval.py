"""Page-level retrieval metrics.

A retrieved chunk is relevant when its document and page are in the golden set.
Chunk ids change when the chunk size changes, so the labels are pages.

Repeated chunks from the same page count once. Order is the first time each
page appears. Precision uses K as the denominator even when fewer pages were
retrieved: a missing slot is not relevant. Rank is 1-based.
nDCG uses binary gain and log base 2.
"""

from __future__ import annotations

import math


def page_key(document_id: str, page: int) -> str:
    return f"{document_id}::p{page}"


def dedupe(retrieved: list[str]) -> list[str]:
    seen: list[str] = []
    for item in retrieved:
        if item not in seen:
            seen.append(item)
    return seen


def _check(k: int, relevant: set[str]) -> None:
    if k < 1:
        raise ValueError("K must be at least 1.")
    if not relevant:
        raise ValueError("The question has no relevant pages.")


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    _check(k, relevant)
    found = set(dedupe(retrieved)[:k]) & relevant
    return len(found) / len(relevant)


def precision_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    _check(k, relevant)
    top = dedupe(retrieved)[:k]
    hits = sum(1 for item in top if item in relevant)
    return hits / k


def mrr(retrieved: list[str], relevant: set[str]) -> float:
    if not relevant:
        raise ValueError("The question has no relevant pages.")
    for rank, item in enumerate(dedupe(retrieved), start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    _check(k, relevant)
    top = dedupe(retrieved)[:k]
    dcg = 0.0
    for rank, item in enumerate(top, start=1):
        if item in relevant:
            dcg += 1.0 / math.log2(rank + 1)
    ideal_hits = min(k, len(relevant))
    idcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_hits + 1))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def citation_precision(cited: list[str], relevant: set[str]) -> float:
    """Fraction of distinct cited pages that are in the golden set.

    The denominator is the number of distinct cited pages, not K.
    Precision@K divides by K, so the two numbers differ when duplicate pages
    are collapsed or fewer than K pages are returned. An empty citation list
    scores 0. This is not answer accuracy.
    """

    if not relevant:
        raise ValueError("The question has no relevant pages.")
    if not cited:
        return 0.0
    unique = dedupe(cited)
    hits = sum(1 for item in unique if item in relevant)
    return hits / len(unique)
