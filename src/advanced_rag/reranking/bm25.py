"""Rerank the retrieved chunks with BM25.

The notebook asked BM25 for a score at `metadata["id"]`, and the chunks had no
such id. The fallback was the position in the retrieved list, so the first hit
was scored as corpus row 0. Scoring uses `corpus_index` instead.
"""

from __future__ import annotations

import string
from dataclasses import replace

from advanced_rag.models import Chunk, RetrievedChunk

# Local list. This replaces the private sklearn English stopword import.
_STOPWORDS = frozenset(
    {
        "a", "about", "above", "across", "after", "afterwards", "again", "against",
        "all", "almost", "alone", "along", "already", "also", "although", "always",
        "am", "among", "amongst", "amount", "an", "and", "another", "any", "anyhow",
        "anyone", "anything", "anyway", "anywhere", "are", "around", "as", "at",
        "back", "be", "became", "because", "become", "becomes", "becoming", "been",
        "before", "beforehand", "behind", "being", "below", "beside", "besides",
        "between", "beyond", "both", "bottom", "but", "by", "can", "cannot", "could",
        "did", "do", "does", "doing", "done", "down", "during", "each", "either",
        "else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every",
        "everyone", "everything", "everywhere", "except", "few", "for", "former",
        "formerly", "from", "front", "full", "further", "get", "give", "go", "had",
        "has", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein",
        "hereupon", "hers", "herself", "him", "himself", "his", "how", "however",
        "i", "if", "in", "indeed", "into", "is", "it", "its", "itself", "last",
        "latter", "latterly", "least", "less", "made", "many", "may", "me",
        "meanwhile", "might", "mine", "more", "moreover", "most", "mostly", "much",
        "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless",
        "next", "no", "nobody", "none", "nor", "not", "nothing", "now", "nowhere",
        "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other",
        "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own",
        "part", "per", "perhaps", "please", "put", "rather", "same", "see", "seem",
        "seemed", "seeming", "seems", "several", "she", "should", "show", "side",
        "since", "so", "some", "somehow", "someone", "something", "sometime",
        "sometimes", "somewhere", "still", "such", "take", "than", "that", "the",
        "their", "them", "themselves", "then", "thence", "there", "thereafter",
        "thereby", "therefore", "therein", "thereupon", "these", "they", "this",
        "those", "though", "through", "throughout", "thru", "thus", "to", "together",
        "too", "toward", "towards", "under", "until", "up", "upon", "us", "very",
        "via", "was", "we", "were", "what", "whatever", "when", "whence", "whenever",
        "where", "whereafter", "whereas", "whereby", "wherein", "whereupon",
        "wherever", "whether", "which", "while", "whither", "who", "whoever",
        "whole", "whom", "whose", "why", "will", "with", "within", "without",
        "would", "yet", "you", "your", "yours", "yourself", "yourselves",
    }
)


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in text.lower().split()
        if token not in _STOPWORDS and token not in string.punctuation
    ]


class BM25Reranker:
    def __init__(self, chunks: list[Chunk]) -> None:
        if not chunks:
            raise ValueError("Cannot fit BM25 on an empty corpus.")
        try:
            from rank_bm25 import BM25Okapi
        except ImportError as exc:
            raise RuntimeError("rank-bm25 is required for reranking.") from exc
        self._size = len(chunks)
        self._model = BM25Okapi([tokenize(chunk.text) for chunk in chunks])

    def top_ids(self, query: str, chunks: list[Chunk], top_k: int) -> list[str]:
        scores = self._model.get_scores(tokenize(query))
        order = sorted(range(len(chunks)), key=lambda index: (-float(scores[index]), index))
        return [chunks[index].chunk_id for index in order[:top_k]]

    def rerank(
        self,
        query: str,
        retrieved: list[RetrievedChunk],
        top_k: int,
    ) -> list[RetrievedChunk]:
        scores = self._model.get_scores(tokenize(query))
        scored: list[tuple[RetrievedChunk, float]] = []
        for item in retrieved:
            if item.corpus_index < 0 or item.corpus_index >= self._size:
                raise ValueError(
                    f"Chunk {item.chunk_id} has corpus index {item.corpus_index}, "
                    "which is outside the indexed corpus."
                )
            scored.append((item, float(scores[item.corpus_index])))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return [
            replace(item, rank=rank, score=score, score_type="bm25")
            for rank, (item, score) in enumerate(scored[:top_k], start=1)
        ]
