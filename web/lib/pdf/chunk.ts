import { CHUNK_OVERLAP, CHUNK_SIZE, MAX_CHUNKS } from "./limits";
import type { PdfChunk, PdfPage } from "./types";

export function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/(\p{L})[-\u00ad]\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/[\u2000-\u200b\u202f]/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

export function chunkPages(pages: PdfPage[], size = CHUNK_SIZE, overlap = CHUNK_OVERLAP, limit = MAX_CHUNKS): PdfChunk[] {
  if (overlap >= size) throw new Error("overlap must be smaller than size");
  const chunks: PdfChunk[] = [];
  for (const page of pages) {
    const text = cleanText(page.text).replace(/\n/g, " ");
    if (!text) continue;
    let start = 0;
    let part = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + size);
      if (end < text.length) {
        const space = text.lastIndexOf(" ", end);
        if (space > start + size / 2) end = space;
      }
      const piece = text.slice(start, end).trim();
      if (piece) {
        chunks.push({ id: `p${page.page}:c${part}`, page: page.page, text: piece });
        part += 1;
        if (chunks.length >= limit) return chunks;
      }
      if (end >= text.length) break;
      let next = end - overlap;
      const space = text.indexOf(" ", next);
      if (space > 0 && space < end) next = space + 1;
      start = Math.max(next, start + 1);
    }
  }
  return chunks;
}
