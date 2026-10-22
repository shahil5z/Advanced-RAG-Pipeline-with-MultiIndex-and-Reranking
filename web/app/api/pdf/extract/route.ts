import { MAX_PART_BYTES, MAX_PDF_BYTES } from "@/lib/pdf/limits";
import { extractPages, PdfReadError } from "@/lib/pdf/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("x-pdf-total-bytes") ?? "0");
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_PDF_BYTES) {
    return error("The PDF is larger than the 10 MB maximum.", 413);
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_PART_BYTES) return error("This upload part is too large.", 413);
  const offset = Number(request.headers.get("x-pdf-page-offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) return error("Invalid page offset.", 400);
  const buffer = new Uint8Array(await request.arrayBuffer());
  if (buffer.byteLength === 0) return error("The file is empty.", 400);
  if (buffer.byteLength > MAX_PART_BYTES) return error("This upload part is too large.", 413);
  const magic = new TextDecoder().decode(buffer.slice(0, 5));
  if (magic !== "%PDF-") return error("The file is not a PDF.", 415);
  try {
    const result = await extractPages(buffer, offset);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    if (caught instanceof PdfReadError) return error(caught.message, caught.status);
    console.error("pdf extract failed", caught instanceof Error ? caught.name : "unknown");
    return error("The PDF could not be read. It may be damaged.", 422);
  }
}
