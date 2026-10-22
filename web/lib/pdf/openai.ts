import { EMBEDDING_DIMENSIONS } from "./limits";
import type { Usage } from "./types";

export const PDF_EMBEDDING_MODEL = "text-embedding-3-small";
export const PDF_CHAT_MODEL = "gpt-4o-mini";
const PRICE = { embedding: 0.02, input: 0.15, output: 0.6 };

export function apiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the server.");
  return key;
}

async function post(path: string, body: unknown, timeout = 30_000): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}.`);
  return (await response.json()) as Record<string, unknown>;
}

export function emptyUsage(): Usage {
  return { embedding_tokens: 0, input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 };
}

export function priceUsage(usage: Usage): Usage {
  const cost =
    (usage.embedding_tokens * PRICE.embedding + usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output) /
    1_000_000;
  return { ...usage, estimated_cost_usd: Number(cost.toFixed(6)) };
}

export async function embed(texts: string[], usage: Usage): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += 100) {
    const batch = texts.slice(start, start + 100);
    const payload = await post("/embeddings", {
      model: PDF_EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const rows = payload.data as Array<{ index: number; embedding: number[] }> | undefined;
    if (!rows || rows.length !== batch.length) throw new Error("Unexpected embedding payload.");
    rows.sort((left, right) => left.index - right.index).forEach((row) => vectors.push(row.embedding));
    const used = payload.usage as { prompt_tokens?: number } | undefined;
    usage.embedding_tokens += used?.prompt_tokens ?? 0;
  }
  return vectors;
}

export async function chatJson(system: string, user: string, maxTokens: number, usage: Usage): Promise<unknown> {
  const payload = await post("/chat/completions", {
    model: PDF_CHAT_MODEL,
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const used = payload.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  usage.input_tokens += used?.prompt_tokens ?? 0;
  usage.output_tokens += used?.completion_tokens ?? 0;
  const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("The model did not return JSON.");
  }
}
