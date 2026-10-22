import { parseQuery } from "@/lib/rag/request";
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
    if (raw.length > 20_000) {
      return Response.json({ error: "The request is too large." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Send a JSON body with a question." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send a JSON body with a question." }, { status: 400 });
  }

  const parsed = parseQuery(body as Record<string, unknown>);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const result = await runQuery(parsed.value);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("query failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "The query could not be completed." }, { status: 500 });
  }
}
