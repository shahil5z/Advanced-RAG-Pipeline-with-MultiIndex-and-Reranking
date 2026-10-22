"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { MAX_QUESTION_CHARS, validatePdfFile } from "@/lib/pdf/limits";
import type { AskResponse, IndexResponse, PdfPage } from "@/lib/pdf/types";

type Stage = "idle" | "reading" | "indexing" | "ready" | "asking";

const MAX_TEXT_CHARS = 400_000;

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed with status ${response.status}.`;
  } catch {
    if (response.status === 413) return "The file is too large. The maximum is 10 MB.";
    return `Request failed with status ${response.status}.`;
  }
}

function usd(value: number): string {
  return `$${value.toFixed(5)}`;
}

export function PdfQa() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [index, setIndex] = useState<IndexResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [rerank, setRerank] = useState(true);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(15);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/pdf/quota", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { remaining?: number; limit?: number }) => {
        if (typeof payload.remaining === "number") setRemaining(payload.remaining);
        if (typeof payload.limit === "number") setLimit(payload.limit);
      })
      .catch(() => undefined);
  }, []);

  function track(payload: { remaining?: number; limit?: number }) {
    if (typeof payload.remaining === "number") setRemaining(payload.remaining);
    if (typeof payload.limit === "number") setLimit(payload.limit);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    setResult(null);
    setIndex(null);
    const invalid = validatePdfFile(file);
    if (invalid) {
      setError(invalid);
      if (input.current) input.current.value = "";
      return;
    }
    try {
      setStage("reading");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { splitPdf } = await import("@/lib/pdf/split");
      const parts = await splitPdf(bytes);
      const pages: PdfPage[] = [];
      for (const part of parts) {
        const response = await fetch("/api/pdf/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/pdf",
            "x-pdf-total-bytes": String(file.size),
            "x-pdf-page-offset": String(part.pageOffset),
          },
          body: part.bytes as BodyInit,
        });
        if (!response.ok) throw new Error(await readError(response));
        const payload = (await response.json()) as { pages: PdfPage[] };
        pages.push(...payload.pages);
      }
      let budget = MAX_TEXT_CHARS;
      const kept: PdfPage[] = [];
      for (const page of pages) {
        if (budget <= 0) break;
        kept.push({ page: page.page, text: page.text.slice(0, budget) });
        budget -= page.text.length;
      }
      if (kept.length < pages.length) setNotice(`Only the first ${kept.length} of ${pages.length} pages fit the session index.`);
      setStage("indexing");
      const response = await fetch("/api/pdf/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: file.name, pages: kept }),
      });
      const payload = response.ok ? ((await response.json()) as IndexResponse) : null;
      if (!response.ok || !payload) {
        if (response.status === 429) setRemaining(0);
        throw new Error(await readError(response));
      }
      track(payload);
      setIndex(payload);
      setStage("ready");
    } catch (caught) {
      setStage("idle");
      setError(caught instanceof Error ? caught.message : "The PDF could not be processed.");
    }
  }

  async function ask(text: string) {
    const cleaned = text.trim();
    if (!index) return;
    if (!cleaned) {
      setError("Enter a question first.");
      return;
    }
    setQuestion(cleaned);
    setError("");
    setStage("asking");
    try {
      const response = await fetch("/api/pdf/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleaned, rerank, chunks: index.chunks }),
      });
      if (!response.ok) {
        if (response.status === 429) setRemaining(0);
        throw new Error(await readError(response));
      }
      const payload = (await response.json()) as AskResponse;
      track(payload);
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The question failed.");
    } finally {
      setStage("ready");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const busy = stage === "reading" || stage === "indexing" || stage === "asking";
  const exhausted = remaining === 0;

  return (
    <section className="shell space-y-6 py-10" aria-labelledby="pdf-heading">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your PDF</p>
        <h2 id="pdf-heading" className="text-3xl">
          Ask questions about a PDF
        </h2>
        <p className="text-sm leading-6 text-muted">
          Upload a PDF up to 10 MB. Text is extracted on the server, split into overlapping chunks with page numbers, embedded with text-embedding-3-small, and searched with cosine similarity and BM25 fused by reciprocal rank fusion, then optionally reranked by gpt-4o-mini. The index lives in this browser tab only and is not stored.
        </p>
        <p className="text-sm font-semibold" aria-live="polite">
          {remaining === null ? `Limit: ${limit} tests per day.` : `${remaining} of ${limit} tests left today.`} An upload or a question counts as one test.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="panel space-y-4 p-5">
          <label className="block text-sm font-semibold" htmlFor="pdf-file">
            PDF file (max 10 MB)
          </label>
          <input
            ref={input}
            id="pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy || exhausted}
            onChange={onFile}
            className="block w-full text-sm"
          />
          {stage === "reading" ? <p className="text-sm text-muted" role="status">Extracting text…</p> : null}
          {stage === "indexing" ? <p className="text-sm text-muted" role="status">Embedding chunks and writing suggestions…</p> : null}
          {index ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{index.document}</p>
              <p className="text-muted">
                {index.pages} pages, {index.chunks.length} chunks. Indexing cost about {usd(index.usage.estimated_cost_usd)}.
              </p>
            </div>
          ) : null}
          {notice ? <p className="rounded-xl bg-wash px-3 py-2 text-sm leading-6">{notice}</p> : null}

          {index ? (
            <form onSubmit={onSubmit} className="space-y-3">
              {index.suggestions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Suggested questions</p>
                  <div className="flex flex-wrap gap-2">
                    {index.suggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        disabled={busy || exhausted}
                        onClick={() => void ask(item)}
                        className="rounded-full border border-line bg-paper px-3 py-1 text-left text-sm hover:bg-wash disabled:opacity-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="block text-sm font-semibold" htmlFor="pdf-question">
                Your question
              </label>
              <textarea
                id="pdf-question"
                value={question}
                maxLength={MAX_QUESTION_CHARS}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm leading-6 text-ink"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rerank} onChange={(event) => setRerank(event.target.checked)} />
                Rerank the fused candidates with gpt-4o-mini
              </label>
              <button type="submit" disabled={busy || exhausted} className="btn rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {stage === "asking" ? "Answering…" : "Ask"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-accent/40 bg-wash px-5 py-4 text-sm leading-6" role="alert">
              <p className="font-semibold">That did not work</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}
          {!result && !error ? (
            <div className="panel border-dashed px-5 py-10">
              <p className="font-serif text-2xl">Answers appear here</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">Upload a PDF, then pick a suggested question or type your own.</p>
            </div>
          ) : null}
          {result ? <PdfAnswer result={result} /> : null}
        </div>
      </div>
    </section>
  );
}

function PdfAnswer({ result }: { result: AskResponse }) {
  return (
    <div className="rise space-y-4">
      <article className="panel overflow-hidden">
        <div className="border-b border-line bg-wash/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</p>
          <h3 className="mt-1 text-2xl">{result.found ? "Grounded in the retrieved passages" : "Not supported by the passages"}</h3>
        </div>
        <p className="whitespace-pre-line px-5 py-5 text-base leading-7">{result.answer}</p>
        <p className="border-t border-line px-5 py-3 text-sm leading-6 text-muted">
          {result.citations.length > 0 ? `Cited pages: ${result.citations.join(", ")}. ` : ""}
          Retrieve {result.latency_ms.retrieve.toFixed(0)} ms, rerank {result.latency_ms.rerank.toFixed(0)} ms, answer {result.latency_ms.generate.toFixed(0)} ms. Estimated cost {usd(result.usage.estimated_cost_usd)} ({result.usage.input_tokens} input and {result.usage.output_tokens} output tokens).
        </p>
      </article>
      <div className="panel p-4">
        <h3 className="text-lg">Top passages{result.reranked ? " after rerank" : " after fusion"}</h3>
        <ol className="mt-3 space-y-3">
          {result.passages.map((item) => (
            <li key={item.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-semibold">
                {item.rank}. Page {item.page}
              </p>
              <p className="mt-1 text-xs text-muted">
                RRF {item.rrf.toFixed(4)} · cosine {item.cosine.toFixed(3)} · BM25 {item.bm25.toFixed(3)}
              </p>
              <p className="mt-2 text-sm leading-6">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
