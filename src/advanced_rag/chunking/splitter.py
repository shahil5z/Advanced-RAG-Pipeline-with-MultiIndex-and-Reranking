"""Split pages with the same recursive character splitter the notebook used.

Pages are split separately, which matches LangChain's split_documents behavior
on one document per page. Chunk ids are derived from the file name, page, and
position on that page, so the same text yields the same ids.
"""

from __future__ import annotations

from advanced_rag.models import Chunk, PageText


def chunk_pages(pages: list[PageText], chunk_size: int, chunk_overlap: int) -> list[Chunk]:
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except ImportError as exc:
        raise RuntimeError("langchain-text-splitters is required to chunk documents.") from exc

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    counts: dict[tuple[str, int], int] = {}
    chunks: list[Chunk] = []
    for page in pages:
        text = page.text.strip()
        if not text:
            continue
        for part in splitter.split_text(text):
            cleaned = part.strip()
            if not cleaned:
                continue
            key = (page.document_id, page.page)
            number = counts.get(key, 0)
            counts[key] = number + 1
            chunks.append(
                Chunk(
                    chunk_id=f"{page.document_id}:p{page.page}:c{number}",
                    document_id=page.document_id,
                    page=page.page,
                    text=cleaned,
                    corpus_index=len(chunks),
                )
            )
    if not chunks:
        raise ValueError("Chunking produced no text.")
    return chunks
