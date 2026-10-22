import { PART_BYTES } from "./limits";

export type PdfPart = { bytes: Uint8Array; pageOffset: number };

export class SplitError extends Error {}

export async function splitPdf(bytes: Uint8Array): Promise<PdfPart[]> {
  if (bytes.byteLength <= PART_BYTES) return [{ bytes, pageOffset: 0 }];
  const { PDFDocument } = await import("pdf-lib");
  let source: Awaited<ReturnType<typeof PDFDocument.load>>;
  try {
    source = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (caught) {
    const name = caught instanceof Error ? caught.constructor.name + " " + caught.message : "";
    if (/encrypt/i.test(name)) throw new SplitError("This PDF is encrypted or password-protected, and files above 3 MB must be split in the browser, which encryption prevents. Remove the protection and upload it again.");
    throw new SplitError("This file is damaged or is not a valid PDF.");
  }
  const total = source.getPageCount();
  if (total === 0) throw new SplitError("This PDF has no pages.");
  const parts: PdfPart[] = [];
  async function build(start: number, end: number): Promise<void> {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(source, Array.from({ length: end - start }, (_, index) => start + index));
    pages.forEach((page) => doc.addPage(page));
    const saved = await doc.save();
    if (saved.byteLength > PART_BYTES && end - start > 1) {
      const middle = Math.floor((start + end) / 2);
      await build(start, middle);
      await build(middle, end);
      return;
    }
    if (saved.byteLength > PART_BYTES * 1.3) throw new SplitError(`Page ${start + 1} alone is larger than 4 MB, so it cannot be uploaded.`);
    parts.push({ bytes: saved, pageOffset: start });
  }
  const groups = Math.max(1, Math.ceil(bytes.byteLength / PART_BYTES));
  const size = Math.ceil(total / groups);
  for (let start = 0; start < total; start += size) await build(start, Math.min(total, start + size));
  return parts;
}
