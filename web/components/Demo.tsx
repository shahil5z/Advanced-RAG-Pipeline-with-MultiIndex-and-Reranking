"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";

import type { QueryResponse } from "@/lib/rag/types";

type Status = "idle" | "loading" | "ready" | "error";

const topKOptions = [2, 3, 4, 6];

function formatScore(result: QueryResponse, score: number): string {
  if (result.configuration.reranking) return `BM25 ${score.toFixed(3)}`;
  return `squared L2 ${score.toFixed(3)}`;
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
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-4xl text-balance">Ask the lab notes</h1>
        <p className="text-base leading-7 text-muted">
          Retrieval runs on the server over six short passages. The flat index compares a hashed query vector with every
          passage, then BM25 can reorder those hits. When <code className="rounded bg-mist px-1.5 py-0.5 text-sm">OPENAI_API_KEY</code> is
          set, embeddings and the written answer use OpenAI. Otherwise the answer is the top passage.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-card p-4 sm:p-5" aria-busy={loading}>
        <div>
          <label htmlFor="question" className="text-sm font-semibold">
            Question
          </label>
          <textarea
            id="question"
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            required
            maxLength={500}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-3 text-base leading-6 text-ink"
          />
        </div>

        {questions.length > 0 ? (
          <div>
            <p id="prepared-label" className="text-sm font-semibold">
              Prepared questions
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="prepared-label">
              {questions.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setQuestion(item);
                    void execute(item);
                  }}
                  className="max-w-full rounded-full border border-line bg-paper px-3 py-2 text-left text-sm leading-5 hover:border-pine hover:bg-mist disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Retrieval options</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-pine"
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
              className="mt-2 block w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
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

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Retrieving…" : "Run retrieval"}
        </button>
      </form>

      <section aria-live="polite" className="space-y-4">
        {status === "idle" ? (
          <p className="rounded-lg border border-dashed border-line bg-card px-4 py-6 text-sm leading-6 text-muted">
            Results appear here. Ask about the lab notes, or choose a prepared question.
          </p>
        ) : null}

        {status === "loading" ? (
          <div className="space-y-3 rounded-lg border border-line bg-card p-4" role="status">
            <p className="text-sm font-semibold">Retrieving passages…</p>
            <div className="h-3 w-2/3 animate-pulse rounded bg-mist" />
            <div className="h-3 w-full animate-pulse rounded bg-mist" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-mist" />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-lg border border-pine/30 bg-mist px-4 py-4 text-sm leading-6" role="alert">
            <p className="font-semibold">The query did not finish</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {status === "ready" && result ? <Result result={result} /> : null}
      </section>
    </div>
  );
}

function Result({ result }: { result: QueryResponse }) {
  const embedding = result.embedding_mode === "openai" ? "OpenAI embeddings" : "Hashed token vectors";
  const answerLabel = result.answer_mode === "openai" ? "Generated from the retrieved passages" : "Top retrieved passage";

  return (
    <div className="space-y-6">
      {result.notice ? <p className="rounded-md bg-mist px-3 py-2 text-sm leading-6">{result.notice}</p> : null}
      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Index</dt>
          <dd className="mt-1 font-semibold">Flat · exact search</dd>
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

      {result.rerank_changed_order ? (
        <p className="text-sm leading-6 text-muted">BM25 reordered these passages compared with squared L2 distance.</p>
      ) : null}

      <section>
        <h2 className="text-2xl">Answer</h2>
        <p className="mt-1 text-sm text-muted">{answerLabel}</p>
        <p className="mt-3 text-base leading-7">{result.answer}</p>
      </section>

      <section>
        <h2 className="text-2xl">Sources</h2>
        <p className="mt-1 text-sm text-muted">Page numbers are zero-based, matching the evaluation labels.</p>
        {result.chunks.length === 0 ? (
          <p className="mt-3 text-sm">No passages were returned.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {result.chunks.map((chunk) => (
              <li key={chunk.chunk_id} className="rounded-lg border border-line bg-card p-4">
                <p className="text-sm font-semibold">
                  {chunk.rank}. {chunk.document} · page {chunk.page}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatScore(result, chunk.score)}
                  {chunk.vector_rank !== chunk.rank ? ` · vector rank ${chunk.vector_rank}` : ""}
                  {result.configuration.reranking ? ` · squared L2 ${chunk.distance.toFixed(3)}` : ""}
                </p>
                <p className="mt-2 text-sm leading-6">{chunk.text}</p>
                <p className="mt-2 font-mono text-xs text-muted">{chunk.chunk_id}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
