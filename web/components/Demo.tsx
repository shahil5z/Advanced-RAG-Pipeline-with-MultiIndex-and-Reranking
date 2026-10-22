"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";

import type { QueryResponse, RetrievedChunk } from "@/lib/rag/types";

type Status = "idle" | "loading" | "ready" | "error";

const topKOptions = [2, 3, 4, 6];

function formatScore(result: QueryResponse, score: number): string {
  if (result.configuration.reranking) return `BM25 ${score.toFixed(3)}`;
  return `squared L2 ${score.toFixed(3)}`;
}

function barPercent(result: QueryResponse, chunk: RetrievedChunk): number {
  if (result.configuration.reranking) {
    const max = Math.max(...result.chunks.map((item) => item.score), 1e-6);
    return Math.max(8, (chunk.score / max) * 100);
  }
  const distances = result.chunks.map((item) => item.distance);
  const max = Math.max(...distances);
  const min = Math.min(...distances);
  if (max === min) return 100;
  return Math.max(8, ((max - chunk.distance) / (max - min)) * 100);
}

function movement(chunk: RetrievedChunk): string | null {
  const delta = chunk.vector_rank - chunk.rank;
  if (delta > 0) return `Up ${delta} from vector rank ${chunk.vector_rank}`;
  if (delta < 0) return `Down ${Math.abs(delta)} from vector rank ${chunk.vector_rank}`;
  return null;
}

export function Demo({ questions }: { questions: string[] }) {
  const [question, setQuestion] = useState(questions[0] ?? "");
  const [reranking, setReranking] = useState(true);
  const [topK, setTopK] = useState(3);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const requestId = useRef(0);

  async function execute(raw: string) {
    const cleaned = raw.trim();
    if (!cleaned) {
      setStatus("error");
      setError("Enter a question first.");
      setResult(null);
      return;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleaned, reranking, top_k: topK }),
      });
      const payload = (await response.json()) as QueryResponse & { error?: string };
      if (id !== requestId.current) return;
      if (!response.ok) {
        setResult(null);
        setStatus("error");
        setError(payload.error || "The query did not complete.");
        return;
      }
      setResult(payload);
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setResult(null);
      setStatus("error");
      setError("The query did not complete. Check the connection and try again.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void execute(question);
  }

  const loading = status === "loading";

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Live retrieval</p>
        <h1 className="text-4xl text-balance sm:text-5xl">Ask the lab notes</h1>
        <p className="text-base leading-7 text-muted">
          The server searches six short passages, then BM25 can reorder those hits. With{" "}
          <code className="rounded bg-wash px-1.5 py-0.5 text-sm">OPENAI_API_KEY</code> set, embeddings and the written
          answer use OpenAI. Otherwise the answer is the top passage.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="panel space-y-5 p-5 lg:sticky lg:top-24" aria-busy={loading}>
          <div>
            <label htmlFor="question" className="text-sm font-semibold">
              Question
            </label>
            <textarea
              id="question"
              name="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              required
              maxLength={500}
              disabled={loading}
              placeholder="Ask about the lab notes"
              className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 text-base leading-6 text-ink"
            />
          </div>

          {questions.length > 0 ? (
            <div>
              <p id="prepared-label" className="text-sm font-semibold">
                Suggested questions
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="prepared-label">
                {questions.map((item) => {
                  const selected = item === question;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={loading}
                      aria-pressed={selected}
                      onClick={() => {
                        setQuestion(item);
                        void execute(item);
                      }}
                      className={`max-w-full rounded-full border px-3 py-2 text-left text-sm leading-5 disabled:opacity-60 ${
                        selected ? "border-navy bg-navy text-white" : "border-line bg-paper hover:border-accent hover:bg-wash"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <fieldset className="grid gap-4">
            <legend className="sr-only">Retrieval options</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-navy"
                checked={reranking}
                disabled={loading}
                onChange={(event) => setReranking(event.target.checked)}
              />
              Rerank with BM25
            </label>
            <label className="block text-sm font-semibold" htmlFor="top-k">
              Passages to keep
              <select
                id="top-k"
                className="mt-2 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base font-normal"
                value={topK}
                disabled={loading}
                onChange={(event) => setTopK(Number(event.target.value))}
              >
                {topKOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Retrieving…" : "Run retrieval"}
          </button>
        </form>

        <section aria-live="polite" className="min-w-0 space-y-4">
          {status === "idle" ? (
            <div className="panel border-dashed px-5 py-10">
              <p className="font-serif text-2xl">Results appear here</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Ask about the lab notes, or choose a suggested question. Ranked passages, scores, and any rerank movement show below the answer.
              </p>
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="panel space-y-3 p-5" role="status">
              <p className="text-sm font-semibold">Retrieving passages…</p>
              <div className="h-3 w-2/3 animate-pulse rounded bg-wash" />
              <div className="h-3 w-full animate-pulse rounded bg-wash" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-wash" />
            </div>
          ) : null}

          {status === "error" ? (
            <div className="rounded-2xl border border-accent/40 bg-wash px-5 py-4 text-sm leading-6" role="alert">
              <p className="font-semibold">The query did not finish</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}

          {status === "ready" && result ? <Result result={result} /> : null}
        </section>
      </div>
    </div>
  );
}

function Result({ result }: { result: QueryResponse }) {
  const embedding = result.embedding_mode === "openai" ? "OpenAI embeddings" : "Hashed token vectors";
  const answerLabel = result.answer_mode === "openai" ? "Generated from the retrieved passages" : "Top retrieved passage";

  return (
    <div className="rise space-y-4">
      {result.notice ? <p className="rounded-xl bg-wash px-3 py-2 text-sm leading-6">{result.notice}</p> : null}

      <article className="panel overflow-hidden">
        <div className="border-b border-line bg-wash/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</p>
          <h2 className="mt-1 text-2xl">{answerLabel}</h2>
        </div>
        <p className="px-5 py-5 text-base leading-7">{result.answer}</p>
        <dl className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">Index</dt>
            <dd className="mt-1 font-semibold">Flat, exact search</dd>
          </div>
          <div>
            <dt className="text-muted">Embedding</dt>
            <dd className="mt-1 font-semibold">{embedding}</dd>
          </div>
          <div>
            <dt className="text-muted">Reranking</dt>
            <dd className="mt-1 font-semibold">{result.configuration.reranking ? "BM25" : "Off"}</dd>
          </div>
          <div>
            <dt className="text-muted">Retrieval</dt>
            <dd className="mt-1 font-semibold tabular-nums">{result.retrieval_latency_ms.toFixed(1)} ms</dd>
          </div>
        </dl>
      </article>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl">Sources</h2>
          <p className="mt-1 text-sm text-muted">
            Page numbers are zero-based, matching the evaluation labels.
            {result.rerank_changed_order ? " BM25 changed the vector order." : ""}
          </p>
        </div>
        {result.chunks.length === 0 ? (
          <p className="text-sm">No passages were returned.</p>
        ) : (
          <ol className="space-y-3">
            {result.chunks.map((chunk) => {
              const shift = result.configuration.reranking ? movement(chunk) : null;
              return (
                <li key={chunk.chunk_id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm font-semibold">
                      <span className="mr-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-navy px-2 text-white">
                        {chunk.rank}
                      </span>
                      {chunk.document}, page {chunk.page}
                    </p>
                    {shift ? <p className="rounded-full bg-wash px-3 py-1 text-xs font-semibold text-accent">{shift}</p> : null}
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {formatScore(result, chunk.score)}
                    {result.configuration.reranking ? ` · squared L2 ${chunk.distance.toFixed(3)}` : ""}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wash" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${barPercent(result, chunk)}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-6">{chunk.text}</p>
                  <p className="mt-2 break-all font-mono text-xs text-muted">{chunk.chunk_id}</p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
