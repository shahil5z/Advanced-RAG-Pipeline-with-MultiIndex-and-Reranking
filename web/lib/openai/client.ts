export const CHAT_MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";

// USD per 1M tokens, list prices.
export const PRICES = {
  [CHAT_MODEL]: { input: 0.15, output: 0.6 },
  [EMBEDDING_MODEL]: { input: 0.02, output: 0 },
} as const;

export class MissingKeyError extends Error {
  constructor() {
    super("The live demo is not configured on this server: OPENAI_API_KEY is missing.");
    this.name = "MissingKeyError";
  }
}

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export type Usage = {
  embedding_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
};

export function emptyUsage(): Usage {
  return { embedding_tokens: 0, input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 };
}

export function priceUsage(usage: Usage): Usage {
  const cost =
    (usage.embedding_tokens * PRICES[EMBEDDING_MODEL].input +
      usage.input_tokens * PRICES[CHAT_MODEL].input +
      usage.output_tokens * PRICES[CHAT_MODEL].output) /
    1_000_000;
  return { ...usage, estimated_cost_usd: Number(cost.toFixed(7)) };
}

export function hasKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function key(): string {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new MissingKeyError();
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function openaiPost(path: string, body: unknown, options: { timeoutMs?: number; attempts?: number } = {}): Promise<Record<string, unknown>> {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const apiKey = key();
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`https://api.openai.com/v1${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      lastStatus = 0;
      if (attempt < attempts) {
        await sleep(400 * 2 ** (attempt - 1));
        continue;
      }
      throw new UpstreamError("The model provider did not respond in time.", 504);
    }
    if (response.ok) return (await response.json()) as Record<string, unknown>;
    lastStatus = response.status;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts) break;
    const after = Number(response.headers.get("retry-after"));
    await sleep(Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 5000) : 500 * 2 ** (attempt - 1));
  }
  if (lastStatus === 401) throw new UpstreamError("The server's OpenAI key was rejected.", 503);
  if (lastStatus === 429) throw new UpstreamError("The model provider is rate limiting requests. Try again in a minute.", 503);
  throw new UpstreamError(`The model provider returned an error (${lastStatus}).`, 502);
}

export async function embedBatch(texts: string[], usage: Usage, dimensions?: number): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += 100) {
    const batch = texts.slice(start, start + 100);
    const payload = await openaiPost("/embeddings", {
      model: EMBEDDING_MODEL,
      input: batch,
      ...(dimensions ? { dimensions } : {}),
    });
    const rows = payload.data as Array<{ index: number; embedding: number[] }> | undefined;
    if (!rows || rows.length !== batch.length) throw new UpstreamError("Unexpected embedding payload.", 502);
    rows.sort((left, right) => left.index - right.index).forEach((row) => vectors.push(row.embedding));
    const used = payload.usage as { prompt_tokens?: number } | undefined;
    usage.embedding_tokens += used?.prompt_tokens ?? 0;
  }
  return vectors;
}

export async function chat(
  messages: Array<{ role: "system" | "user"; content: string }>,
  maxTokens: number,
  usage: Usage,
  json = false,
): Promise<string> {
  const payload = await openaiPost("/chat/completions", {
    model: CHAT_MODEL,
    temperature: 0,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages,
  });
  const used = payload.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  usage.input_tokens += used?.prompt_tokens ?? 0;
  usage.output_tokens += used?.completion_tokens ?? 0;
  const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
  return (choices?.[0]?.message?.content ?? "").trim();
}

export async function chatJson(system: string, user: string, maxTokens: number, usage: Usage): Promise<unknown> {
  const content = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    maxTokens,
    usage,
    true,
  );
  try {
    return JSON.parse(content);
  } catch {
    throw new UpstreamError("The model did not return JSON.", 502);
  }
}

export function errorStatus(error: unknown): { status: number; message: string } | null {
  if (error instanceof MissingKeyError) return { status: 503, message: error.message };
  if (error instanceof UpstreamError) return { status: error.status, message: error.message };
  return null;
}
