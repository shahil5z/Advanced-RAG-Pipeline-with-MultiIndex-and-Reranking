"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import type { PublicIndex, QueryResponse, RetrievedChunk } from "@/lib/rag/types";

type Status = "idle" | "loading" | "ready" | "error";

const indexes: Array<{ id: PublicIndex; label: string; detail: string }> = [
  { id: "flat", label: "Flat", detail: "Exact search over every vector." },
  { id: "hnsw", label: "HNSW-style", detail: "A short graph walk. Not the local FAISS index." },
  { id: "ivf", label: "IVF-style", detail: "Nearest list only. Not the local FAISS index." },
];

function splitPassages(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatScore(reranking: boolean, chunk: RetrievedChunk): string {
  if (reranking) return `BM25 ${chunk.score.toFixed(3)} · squared L2 ${chunk.distance.toFixed(3)}`;
  return `squared L2 ${chunk.score.toFixed(3)}`;
}

export function Demo({ questions }: { questions: string[] }) {
  const params = useSearchParams();
  const sharedQuestion = params.get("q");
  const parsedK = Number(params.get("k"));
  const sharedIndex = params.get("index");
  const [question, setQuestion] = useState(sharedQuestion ?? questions[0] ?? "");
  const [reranking, setReranking] = useState(params.get("rerank") === "0" ? false : true);
  const [topK, setTopK] = useState(Number.isInteger(parsedK) && parsedK >= 1 && parsedK <= 6 ? parsedK : 3);
  const [indexType, setIndexType] = useState<PublicIndex>(sharedIndex === "hnsw" || sharedIndex === "ivf" ? sharedIndex : "flat");
  const [passagesText, setPassagesText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [copied, setCopied] = useState("");
  const requestId = useRef(0);
  const started = useRef(false);

  function shareTarget(text: string, k: number, rerank: boolean, index: PublicIndex): string {
    const search = new URLSearchParams({ q: text, k: String(k), rerank: rerank ? "1" : "0", index });
    return `${window.location.origin}/demo?${search.toString()}`;
  }

  async function execute(raw: string) {
    const cleaned = raw.trim();
    const passages = splitPassages(passagesText);
    if (!cleaned) {
      setStatus("error");
      setError("Enter a question first.");
      setResult(null);
      return;
    }
    if (passages.length > 8) {
      setStatus("error");
      setError("Keep pasted text to 8 passages, separated by a blank line.");
      setResult(null);
      return;
    }
    if (passages.some((passage) => passage.length > 800)) {
      setStatus("error");
      setError("Keep each pasted passage under 800 characters.");
      setResult(null);
      return;
    }

    const limit = passages.length > 0 ? passages.length : 6;
    const usedK = Math.min(topK, limit);
    const url = shareTarget(cleaned, usedK, reranking, indexType);
    window.history.replaceState(null, "", url.replace(window.location.origin, ""));

    const id = requestId.current + 1;
    requestId.current = id;
    setStatus("loading");
    setError("");
    setCopied("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleaned,
          reranking,
          top_k: usedK,
          index_type: indexType,
          ...(passages.length > 0 ? { passages } : {}),
        }),
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

  useEffect(() => {
    if (started.current || !sharedQuestion) return;
    started.current = true;
    void execute(sharedQuestion);
    // A shared link should run once with the settings from the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedQuestion]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void execute(question);
  }

  async function copyLink() {
    const passages = splitPassages(passagesText);
    const usedK = Math.min(topK, passages.length > 0 ? passages.length : 6);
    try {
      await navigator.clipboard.writeText(shareTarget(question.trim(), usedK, reranking, indexType));
      setCopied(passages.length > 0 ? "Link copied. It searches the lab notes, not the pasted text." : "Link copied.");
    } catch {
      setCopied("The clipboard was blocked. Copy the address instead.");
    }
  }

  const loading = status === "loading";
  const pastedCount = splitPassages(passagesText).length;
  const maxK = pastedCount > 0 ? pastedCount : 6;

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Live retrieval</p>
        <h1 className="text-4xl text-balance sm:text-5xl">Ask the lab notes</h1>
        <p className="text-base leading-7 text-muted">
          Choose an index, set how many passages to keep, and compare the vector order with BM25. Prepared questions have a labeled page, so the response includes Recall@k and reciprocal rank.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="panel space-y-5 p-5 lg:sticky lg:top-20" aria-busy={loading}>
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

          <fieldset>
            <legend className="text-sm font-semibold">Index</legend>
            <div className="mt-2 grid gap-2">
              {indexes.map((item) => (
                <label key={item.id} className="flex min-h-11 items-start gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="index-type"
                    className="mt-1 accent-navy"
                    checked={indexType === item.id}
                    disabled={loading}
                    onChange={() => setIndexType(item.id)}
                  />
                  <span>
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-muted">{item.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold" htmlFor="top-k">
            Passages to keep: {Math.min(topK, maxK)}
            <input
              id="top-k"
              type="range"
              min={1}
              max={maxK}
              step={1}
              value={Math.min(topK, maxK)}
              disabled={loading}
              onChange={(event) => setTopK(Number(event.target.value))}
              className="mt-2 block w-full accent-navy"
            />
          </label>

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

          <div>
            <label htmlFor="passages" className="text-sm font-semibold">
              Optional passages
            </label>
            <textarea
              id="passages"
              value={passagesText}
              onChange={(event) => setPassagesText(event.target.value)}
              rows={5}
              disabled={loading}
              placeholder="Paste your own passages, separated by a blank line. Leave this empty to search the lab notes."
              className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm leading-6 text-ink"
            />
            <p className="mt-1 text-xs leading-5 text-muted">Up to 8 passages, 800 characters each. They are not stored.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Retrieving…" : "Run retrieval"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
              Copy query link
            </button>
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            {copied}
          </p>
        </form>

        <section aria-live="polite" className="min-w-0 space-y-4">
          {status === "idle" ? (
            <div className="panel border-dashed px-5 py-10">
              <p className="font-serif text-2xl">Results appear here</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Run a question to see the answer, the latency breakdown, and the same hits with and without BM25.
              </p>
            </div>
          ) : null}
          {status === "loading" ? (
            <div className="panel space-y-3 p-5" role="status">
              <p className="text-sm font-semibold">Retrieving passages…</p>
              <div className="h-3 w-2/3 animate-pulse rounded bg-wash" />
              <div className="h-24 animate-pulse rounded-xl bg-wash" />
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
  const sameOrder = result.comparison.vector.map((chunk) => chunk.chunk_id).join() === result.comparison.reranked.map((chunk) => chunk.chunk_id).join();
  return (
    <div className="rise space-y-4">
      {result.notice ? <p className="rounded-xl bg-wash px-3 py-2 text-sm leading-6">{result.notice}</p> : null}
      <article className="panel overflow-hidden">
        <div className="border-b border-line bg-wash/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</p>
          <h2 className="mt-1 text-2xl">{result.answer_mode === "openai" ? "Generated from the retrieved passages" : "Top retrieved passage"}</h2>
        </div>
        <p className="px-5 py-5 text-base leading-7">{result.answer}</p>
        <p className="border-t border-line px-5 py-3 text-sm leading-6 text-muted">{result.configuration.index_note}</p>
      </article>

      <div className="grid gap-3 sm:grid-cols-2">
        <dl className="panel grid grid-cols-2 gap-3 p-4 text-sm">
          <div>
            <dt className="text-muted">Vectors searched</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {result.configuration.vectors_searched} of {result.configuration.vectors_total}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Embed</dt>
            <dd className="mt-1 font-semibold tabular-nums">{result.latency_ms.embed.toFixed(1)} ms</dd>
          </div>
          <div>
            <dt className="text-muted">Search</dt>
            <dd className="mt-1 font-semibold tabular-nums">{result.latency_ms.search.toFixed(1)} ms</dd>
          </div>
          <div>
            <dt className="text-muted">Rerank</dt>
            <dd className="mt-1 font-semibold tabular-nums">{result.latency_ms.rerank.toFixed(1)} ms</dd>
          </div>
        </dl>
        <div className="panel p-4 text-sm">
          <h2 className="text-lg">This query</h2>
          {result.metrics.labeled ? (
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted">Recall@{result.chunks.length}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{result.metrics.recall_at_k?.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-muted">Reciprocal rank</dt>
                <dd className="mt-1 font-semibold tabular-nums">{result.metrics.reciprocal_rank?.toFixed(3)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Labeled page</dt>
                <dd className="mt-1 font-semibold">{result.metrics.relevant_pages.join(", ")}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 leading-6 text-muted">This question has no labeled page, so Recall and MRR are not scored.</p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl">With and without BM25</h2>
          <p className="mt-1 text-sm text-muted">{sameOrder ? "BM25 did not change this order." : "BM25 changed the order of these hits."}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <HitColumn title="Vector order" chunks={result.comparison.vector} reranking={false} />
          <HitColumn title="After BM25" chunks={result.comparison.reranked} reranking />
        </div>
      </section>
    </div>
  );
}

function HitColumn({ title, chunks, reranking }: { title: string; chunks: RetrievedChunk[]; reranking: boolean }) {
  return (
    <div className="panel p-4">
      <h3 className="text-lg">{title}</h3>
      {chunks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No passages were returned.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {chunks.map((chunk) => (
            <li key={`${title}-${chunk.chunk_id}`} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-semibold">
                {chunk.rank}. {chunk.document}, page {chunk.page}
              </p>
              <p className="mt-1 text-xs text-muted">{formatScore(reranking, chunk)}</p>
              <p className="mt-2 text-sm leading-6">{chunk.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
