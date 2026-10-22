"""Assemble loading, indexing, retrieval, reranking, and generation."""

from __future__ import annotations

import time

from advanced_rag.chunking import chunk_pages
from advanced_rag.config import RAGConfig
from advanced_rag.embeddings import SentenceTransformerEmbedder
from advanced_rag.generation.base import Generator
from advanced_rag.generation.openai import OpenAIGenerator
from advanced_rag.indexes import build_faiss_index
from advanced_rag.ingestion import load_pdfs
from advanced_rag.models import Chunk, Citation, QueryResult, RetrievedChunk
from advanced_rag.reranking import BM25Reranker
from advanced_rag.retrieval import search


class RAGPipeline:
    def __init__(
        self,
        config: RAGConfig,
        generator: Generator | None = None,
        embedder: SentenceTransformerEmbedder | None = None,
    ) -> None:
        self.config = config
        self.generator = generator or OpenAIGenerator(
            model=config.generation_model,
            temperature=config.temperature,
        )
        self.embedder = embedder or SentenceTransformerEmbedder(config.embedding_model)
        self.chunks: list[Chunk] = []
        self._index = None
        self._reranker: BM25Reranker | None = None

    def bind(self, chunks: list[Chunk], index, reranker: BM25Reranker | None) -> None:
        """Attach an index that was built outside this object.

        The matrix runner uses this so several indexes can share one embedding pass.
        """

        self.chunks = chunks
        self._index = index
        self._reranker = reranker

    def build(self) -> None:
        """Load the configured PDFs and build the selected index."""

        pages = load_pdfs(self.config.input_paths)
        self.chunks = chunk_pages(pages, self.config.chunk_size, self.config.chunk_overlap)
        vectors = self.embedder.embed_documents([chunk.text for chunk in self.chunks])
        if len(vectors) != len(self.chunks):
            raise RuntimeError("The embedder returned a different number of vectors than chunks.")
        self._index = build_faiss_index(vectors, self.config)
        self._reranker = BM25Reranker(self.chunks) if self.config.reranking else None

    def retrieve(self, question: str) -> tuple[list[RetrievedChunk], float]:
        """Return ranked chunks and retrieval time in milliseconds.

        Retrieval does not call a generation provider.
        """

        cleaned = question.strip()
        if not cleaned:
            raise ValueError("Question is empty.")
        if self._index is None:
            self.build()
        started = time.perf_counter()
        retrieved = search(
            self._index,
            self.embedder.embed_query(cleaned),
            self.chunks,
            self.config.top_k,
        )
        if self._reranker is not None:
            retrieved = self._reranker.rerank(cleaned, retrieved, self.config.top_k)
        elapsed = (time.perf_counter() - started) * 1000
        return retrieved, elapsed

    def query(self, question: str) -> QueryResult:
        cleaned = question.strip()
        retrieved, retrieval_ms = self.retrieve(cleaned)
        generation_started = time.perf_counter()
        answer = self.generator.generate(cleaned, retrieved)
        generation_ms = (time.perf_counter() - generation_started) * 1000
        if not isinstance(answer, str):
            raise RuntimeError("The generator did not return text.")

        return QueryResult(
            answer=answer,
            query=cleaned,
            retrieved_chunks=retrieved,
            citations=[_citation(chunk) for chunk in retrieved],
            retrieval_latency_ms=retrieval_ms,
            generation_latency_ms=generation_ms,
            configuration=self.config.to_dict(),
        )


def _citation(chunk: RetrievedChunk) -> Citation:
    return Citation(
        chunk_id=chunk.chunk_id,
        document_id=chunk.document_id,
        page=chunk.page,
        rank=chunk.rank,
    )
