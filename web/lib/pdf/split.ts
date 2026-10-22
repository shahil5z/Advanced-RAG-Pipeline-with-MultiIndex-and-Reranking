import { PART_BYTES } from "./limits";

export type PdfPart = { bytes: Uint8Array; pageOffset: number };

export async function splitPdf(bytes: Uint8Array): Promise<PdfPart[]> {
  if (bytes.byteLength <= PART_BYTES) return [{ bytes, pageOffset: 0 }];
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = source.getPageCount();
  const parts: PdfPart[] = [];
  async function build(start: number, end: number): Promise<void> {
    const doc = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, index) => start + index);
    const pages = await doc.copyPages(source, indices);
    pages.forEach((page) => doc.addPage(page));
    const saved = await doc.save();
    if (saved.byteLength > PART_BYTES && end - start > 1) {
      const middle = Math.floor((start + end) / 2);
      await build(start, middle);
      await build(middle, end);
      return;
    }
    if (saved.byteLength > PART_BYTES * 1.3) {
      throw new Error(`Page ${start + 1} alone is larger than the upload part limit.`);
    }
    parts.push({ bytes: saved, pageOffset: start });
  }
  const groups = Math.max(1, Math.ceil(bytes.byteLength / PART_BYTES));
  const size = Math.ceil(total / groups);
  for (let start = 0; start < total; start += size) {
    await build(start, Math.min(total, start + size));
  }
  return parts;
}
