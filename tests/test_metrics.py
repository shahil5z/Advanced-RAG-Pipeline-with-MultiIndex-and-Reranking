import math

import pytest

from ragcheck.metrics.retrieval import (
    citation_precision,
    mrr,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)

RELEVANT = {"a", "b"}


def test_recall_and_precision_hand_example():
    retrieved = ["c", "a", "b", "a"]
    assert recall_at_k(retrieved, RELEVANT, 3) == 1
    assert precision_at_k(retrieved, RELEVANT, 3) == pytest.approx(2 / 3)


def test_mrr_is_reciprocal_of_first_hit():
    assert mrr(["c", "a"], RELEVANT) == 0.5
    assert mrr(["c", "d"], RELEVANT) == 0


def test_ndcg_binary():
    retrieved = ["c", "a", "b"]
    dcg = 1 / math.log2(3) + 1 / math.log2(4)
    idcg = 1 + 1 / math.log2(3)
    assert ndcg_at_k(retrieved, RELEVANT, 3) == pytest.approx(dcg / idcg)


def test_duplicates_count_once():
    assert recall_at_k(["a", "a"], {"a"}, 2) == 1
    assert precision_at_k(["a", "a"], {"a"}, 2) == 0.5


def test_fewer_results_than_k_do_not_shrink_the_denominator():
    assert precision_at_k(["a"], RELEVANT, 5) == pytest.approx(0.2)


def test_empty_retrieval():
    assert recall_at_k([], RELEVANT, 5) == 0
    assert precision_at_k([], RELEVANT, 5) == 0
    assert mrr([], RELEVANT) == 0
    assert ndcg_at_k([], RELEVANT, 5) == 0
    assert citation_precision([], RELEVANT) == 0


def test_invalid_k_and_empty_relevant():
    with pytest.raises(ValueError):
        recall_at_k(["a"], RELEVANT, 0)
    with pytest.raises(ValueError):
        recall_at_k(["a"], set(), 1)


def test_citation_precision_uses_emitted_citations():
    assert citation_precision(["a", "c"], RELEVANT) == 0.5
