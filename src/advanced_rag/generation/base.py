"""Provider-neutral generation.

Any generator receives the question and the retrieved chunks. The prompt
builder is shared so a later provider cannot skip the retrieved context.
"""

from __future__ import annotations

from typing import Protocol

from advanced_rag.models import RetrievedChunk


class Generator(Protocol):
    def generate(self, query: str, contexts: list[RetrievedChunk]) -> str:
        """Return an answer grounded in `contexts`."""


def build_context_prompt(query: str, contexts: list[RetrievedChunk]) -> str:
    if contexts:
        blocks = [
            f"[{chunk.chunk_id}] {chunk.document_id} page {chunk.page}\n{chunk.text}"
            for chunk in contexts
        ]
        context = "\n\n".join(blocks)
    else:
        context = "No documents were retrieved."
    return (
        "You are an expert assistant. Answer the question using only the context below.\n\n"
        f"Question: {query}\n\n"
        "Context:\n"
        f"{context}\n\n"
        "Instructions:\n"
        "1. Provide a clear, concise answer.\n"
        '2. If the context does not contain the answer, say "I could not find an answer."\n'
        "3. When you use a source, mention its chunk id.\n\n"
        "Answer:\n"
    )
