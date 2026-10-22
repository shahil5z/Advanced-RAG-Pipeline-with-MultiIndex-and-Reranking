import { MAX_PAGES } from "@/lib/pdf/limits";
import { buildIndex } from "@/lib/pdf/pipeline";
import { checkQuota, limitResponse, quotaHeaders } from "@/lib/pdf/quota";
import type { PdfPage } from "@/lib/pdf/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const quota = checkQuota(request);
  if (!quota.allowed) return limitResponse(quota);
  let body: { document?: unknown; pages?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 3_500_000) return Response.json({ error: "The extracted text is too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Send JSON with the extracted pages." }, { status: 400 });
  }
  const pages = Array.isArray(body.pages) ? body.pages : [];
  if (pages.length === 0 || pages.length > MAX_PAGES) {
    return Response.json({ error: "Send between 1 and 400 pages." }, { status: 400 });
  }
  const clean: PdfPage[] = [];
  for (const item of pages) {
    if (!item || typeof item !== "object") return Response.json({ error: "Invalid page." }, { status: 400 });
    const { page, text } = item as { page?: unknown; text?: unknown };
    if (!Number.isInteger(page) || typeof text !== "string") return Response.json({ error: "Invalid page." }, { status: 400 });
    clean.push({ page: page as number, text: text.slice(0, 20_000) });
  }
  const document = typeof body.document === "string" ? body.document.slice(0, 120) : "document.pdf";
  try {
    const result = await buildIndex(clean);
    const used = quota.commit();
    return Response.json(
      { document, pages: clean.length, ...result, remaining: used.remaining, limit: used.limit },
      { headers: quotaHeaders(used) },
    );
  } catch (caught) {
    if (caught instanceof RangeError) return Response.json({ error: caught.message }, { status: 422 });
    console.error("pdf index failed", caught instanceof Error ? caught.message : "unknown");
    return Response.json({ error: "The document could not be indexed." }, { status: 502 });
  }
}
