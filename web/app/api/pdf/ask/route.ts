import { EMBEDDING_DIMENSIONS, MAX_CHUNK_CHARS, MAX_CHUNKS, MAX_QUESTION_CHARS } from "@/lib/pdf/limits";
import { answerQuestion } from "@/lib/pdf/pipeline";
import { checkQuota, limitResponse, quotaHeaders } from "@/lib/pdf/quota";
import type { IndexedChunk } from "@/lib/pdf/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VECTOR_CHARS = Math.ceil(EMBEDDING_DIMENSIONS / 3) * 4;

function bad(message: string, status = 400): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const quota = checkQuota(request);
  if (!quota.allowed) return limitResponse(quota);
  let body: { question?: unknown; chunks?: unknown; rerank?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 1_500_000) return bad("The request is too large.", 413);
    body = JSON.parse(raw);
  } catch {
    return bad("Send JSON with a question and the session index.");
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return bad("Enter a question first.");
  if (question.length > MAX_QUESTION_CHARS) return bad(`Questions are limited to ${MAX_QUESTION_CHARS} characters.`);
  const rows = Array.isArray(body.chunks) ? body.chunks : [];
  if (rows.length === 0 || rows.length > MAX_CHUNKS) return bad("Upload a PDF first.");
  const chunks: IndexedChunk[] = [];
  for (const row of rows) {
    const item = row as Partial<IndexedChunk>;
    if (
      typeof item?.id !== "string" ||
      !Number.isInteger(item.page) ||
      typeof item.text !== "string" ||
      item.text.length > MAX_CHUNK_CHARS ||
      typeof item.v !== "string" ||
      item.v.length !== VECTOR_CHARS
    ) {
      return bad("The session index is invalid. Upload the PDF again.");
    }
    chunks.push({ id: item.id.slice(0, 40), page: item.page as number, text: item.text, v: item.v });
  }
  try {
    const result = await answerQuestion(question, chunks, body.rerank !== false);
    const used = quota.commit();
    return Response.json({ ...result, remaining: used.remaining, limit: used.limit }, { headers: quotaHeaders(used) });
  } catch (caught) {
    console.error("pdf ask failed", caught instanceof Error ? caught.message : "unknown");
    return bad("The answer could not be generated.", 502);
  }
}
