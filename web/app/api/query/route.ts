import { runQuery } from "@/lib/rag/query";

export const runtime = "nodejs";

const recent = new Map<string, number[]>();

function allow(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "local";
  const now = Date.now();
  const stamps = (recent.get(ip) ?? []).filter((stamp) => now - stamp < 60_000);
  if (stamps.length >= 40) {
    recent.set(ip, stamps);
    return false;
  }
  stamps.push(now);
  recent.set(ip, stamps);
  if (recent.size > 5_000) recent.clear();
  return true;
}

export async function GET() {
  return Response.json({
    ok: true,
    corpus: "lab-notes.pdf",
    openai_configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}

export async function POST(request: Request) {
  if (!allow(request)) {
    return Response.json(
      { error: "Too many questions from this network. Wait a minute and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8_000) {
      return Response.json({ error: "The question is too long." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Send a JSON body with a question." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send a JSON body with a question." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  if (typeof record.question !== "string") {
    return Response.json({ error: "Question must be a string." }, { status: 400 });
  }
  const question = record.question.trim();
  if (!question) {
    return Response.json({ error: "Enter a question first." }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json({ error: "Keep the question under 500 characters." }, { status: 400 });
  }

  const reranking = record.reranking === undefined ? true : record.reranking;
  if (typeof reranking !== "boolean") {
    return Response.json({ error: "Reranking must be true or false." }, { status: 400 });
  }

  let topK = 3;
  if (record.top_k !== undefined) {
    if (typeof record.top_k !== "number" || !Number.isInteger(record.top_k) || record.top_k < 1 || record.top_k > 6) {
      return Response.json({ error: "top_k must be an integer from 1 to 6." }, { status: 400 });
    }
    topK = record.top_k;
  }

  try {
    const result = await runQuery({ question, reranking, topK });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("query failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "The query could not be completed." }, { status: 500 });
  }
}
