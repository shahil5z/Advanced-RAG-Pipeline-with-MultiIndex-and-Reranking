"""Result records returned by the pipeline."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class PageText:
    document_id: str
    page: int
    text: str


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    document_id: str
    page: int
    text: str
    corpus_index: int
    filename: str = ""
    section: str | None = None

    @property
    def stored_filename(self) -> str:
        return self.filename or self.document_id


@dataclass(frozen=True)
class RetrievedChunk:
    """One retrieved chunk.

    `distance` is always the FAISS L2 distance. A smaller distance is closer.
    `score` is the value used for the final order. Before reranking it is the
    L2 distance. After BM25 reranking it is the BM25 score, where larger is better.
    `score_type` says which of those two `score` means.
    """

    chunk_id: str
    document_id: str
    page: int
    text: str
    corpus_index: int
    rank: int
    score: float
    score_type: str
    distance: float

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class Citation:
    chunk_id: str
    document_id: str
    page: int
    rank: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class QueryResult:
    answer: str
    query: str
    retrieved_chunks: list[RetrievedChunk]
    citations: list[Citation]
    retrieval_latency_ms: float
    generation_latency_ms: float
    configuration: dict

    def to_dict(self) -> dict:
        return {
            "answer": self.answer,
            "query": self.query,
            "retrieved_chunks": [chunk.to_dict() for chunk in self.retrieved_chunks],
            "citations": [citation.to_dict() for citation in self.citations],
            "retrieval_latency_ms": self.retrieval_latency_ms,
            "generation_latency_ms": self.generation_latency_ms,
            "configuration": self.configuration,
        }
