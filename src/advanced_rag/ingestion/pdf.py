"""Load PDF text one page at a time.

Page numbers follow PyMuPDF and are zero-based. Only the file name is kept,
so results do not carry a machine-specific directory.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Sequence

from advanced_rag.models import PageText


def load_pdf(path: str | Path) -> list[PageText]:
    pdf_path = Path(path)
    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    try:
        import pymupdf
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required to read PDFs.") from exc

    document: Any = pymupdf.open(pdf_path)
    try:
        return [
            PageText(document_id=pdf_path.name, page=number, text=page.get_text("text") or "")
            for number, page in enumerate(document)
        ]
    finally:
        document.close()


def load_pdfs(paths: Sequence[str | Path]) -> list[PageText]:
    if not paths:
        raise ValueError("No PDF paths were configured.")
    names = [Path(path).name for path in paths]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise ValueError(
            "Two inputs share a file name, so chunk ids would collide: "
            + ", ".join(duplicates)
        )
    pages: list[PageText] = []
    for path in paths:
        pages.extend(load_pdf(path))
    if not any(page.text.strip() for page in pages):
        raise ValueError("The PDFs did not contain extractable text.")
    return pages
