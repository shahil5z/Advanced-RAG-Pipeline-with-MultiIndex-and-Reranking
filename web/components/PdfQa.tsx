"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { MAX_QUESTION_CHARS, validatePdfFile } from "@/lib/pdf/limits";
import type { AskResponse, IndexResponse, PdfPage } from "@/lib/pdf/types";
import { ms, readError, updateQuota, usd, useQuota } from "@/lib/useQuota";

type Stage = "idle" | "reading" | "indexing" | "ready" | "asking";

const MAX_TEXT_CHARS = 400_000;
const REQUEST_TIMEOUT = 90_000;

type Upload = {
  name: string;
  bytes: number;
  parts: number;
  splitMs: number;
  extractMs: number;
  uploadMs: number;
  pagesTotal: number;
  pagesWithText: number;
  truncated: boolean;
};

function hasText(pages: PdfPage[]): boolean {
  return pages.reduce((sum, page) => sum + page.text.replace(/\s+/g, "").length, 0) >= 20;
}

export function PdfQa() {
  const quota = useQuota();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [index, setIndex] = useState<IndexResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [rerank, setRerank] = useState(true);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asked, setAsked] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setIndex(null);
    setUpload(null);
    const invalid = validatePdfFile(file);
    if (invalid) {
      setError(invalid);
      if (input.current) input.current.value = "";
      return;
    }
    try {
      setStage("reading");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const head = new TextDecoder().decode(bytes.slice(0, 1024));
      if (!head.includes("%PDF-")) throw new Error("This file is not a PDF.");
      const splitStarted = performance.now();
      const { splitPdf } = await import("@/lib/pdf/split");
      const parts = await splitPdf(bytes);
      const splitMs = performance.now() - splitStarted;
      const pages: PdfPage[] = [];
      let extractMs = 0;
      const uploadStarted = performance.now();
      for (const part of parts) {
        const response = await fetch("/api/pdf/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/pdf",
            "x-pdf-total-bytes": String(file.size),
            "x-pdf-page-offset": String(part.pageOffset),
          },
          body: part.bytes as BodyInit,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!response.ok) throw new Error(await readError(response));
        const payload = (await response.json()) as { pages: PdfPage[]; extract_ms: number };
        extractMs += payload.extract_ms;
        pages.push(...payload.pages);
      }
      const uploadMs = performance.now() - uploadStarted;
      if (!hasText(pages)) {
        throw new Error("No extractable text was found in this PDF. It may be a scanned document or contain only images. Try a PDF with a text layer, or run OCR first. This did not use a test.");
      }
      let budget = MAX_TEXT_CHARS;
      const kept: PdfPage[] = [];
      for (const page of pages) {
        if (budget <= 0) break;
        kept.push({ page: page.page, text: page.text.slice(0, budget) });
        budget -= page.text.length;
      }
      setUpload({
        name: file.name,
        bytes: file.size,
        parts: parts.length,
        splitMs,
        extractMs,
        uploadMs,
        pagesTotal: pages.length,
        pagesWithText: pages.filter((page) => page.text.trim().length > 0).length,
        truncated: kept.length < pages.length || budget < 0,
      });
      setStage("indexing");
      const response = await fetch("/api/pdf/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: file.name, pages: kept }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as IndexResponse;
      updateQuota(payload);
      setIndex(payload);
      setStage("ready");
    } catch (caught) {
      setStage("idle");
      const message = caught instanceof Error ? caught.message : "The PDF could not be processed.";
      setError(caught instanceof DOMException && caught.name === "TimeoutError" ? "The request timed out. Try again or use a smaller PDF." : message);
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = (await response.json()) as AskResponse;
      updateQuota(payload);
      setAsked(cleaned);
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "TimeoutError" ? "The request timed out. Try again." : caught instanceof Error ? caught.message : "The question failed.");
    } finally {
      setStage("ready");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const busy = stage === "reading" || stage === "indexing" || stage === "asking";
  const blocked = quota.remaining === 0 || quota.configured === false;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="panel space-y-4 p-5 lg:sticky lg:top-20">
        <label className="block text-sm font-semibold" htmlFor="pdf-file">
          PDF file, up to 10 MB
        </label>
        <input
          ref={input}
          id="pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy || blocked}
          onChange={onFile}
          className="block w-full rounded-xl border border-dashed border-line bg-paper p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:font-semibold file:text-white"
        />
        {stage === "reading" ? <p className="text-sm text-muted" role="status">Splitting and extracting text…</p> : null}
        {stage === "indexing" ? <p className="text-sm text-muted" role="status">Embedding chunks and writing suggested questions…</p> : null}

        {index && upload ? <IndexStats index={index} upload={upload} /> : null}

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
                      disabled={busy || blocked}
                      onClick={() => void ask(item)}
                      className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-sm transition hover:border-accent hover:bg-wash disabled:opacity-50"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No suggested questions were returned. Type your own question below.</p>
            )}
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
              <input type="checkbox" className="h-4 w-4 accent-navy" checked={rerank} onChange={(event) => setRerank(event.target.checked)} />
              Rerank the fused candidates with gpt-4o-mini
            </label>
            <button type="submit" disabled={busy || blocked} className="btn-primary">
              {stage === "asking" ? "Answering…" : "Ask"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="min-w-0 space-y-4" aria-live="polite">
        {error ? (
          <div className="rounded-2xl border border-accent/40 bg-wash px-5 py-4 text-sm leading-6" role="alert">
            <p className="font-semibold">That did not work</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}
        {stage === "asking" ? (
          <div className="panel space-y-3 p-5" role="status">
            <p className="text-sm font-semibold">Retrieving passages and writing the answer…</p>
            <div className="h-3 w-2/3 animate-pulse rounded bg-wash" />
            <div className="h-24 animate-pulse rounded-xl bg-wash" />
          </div>
        ) : null}
        {!result && !error && stage !== "asking" ? (
          <div className="panel border-dashed px-5 py-10">
            <p className="font-serif text-2xl">Answers appear here</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Upload a PDF, then pick a suggested question or type your own. Every number in the result is measured for that request.
            </p>
          </div>
        ) : null}
        {result && stage !== "asking" ? <PdfAnswer result={result} question={asked} /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function IndexStats({ index, upload }: { index: IndexResponse; upload: Upload }) {
  return (
    <div className="space-y-2 rounded-xl bg-wash p-3 text-sm">
      <p className="break-all font-semibold">{upload.name}</p>
      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Size" value={`${(upload.bytes / (1024 * 1024)).toFixed(2)} MB in ${upload.parts} part${upload.parts === 1 ? "" : "s"}`} />
        <Stat label="Pages with text" value={`${upload.pagesWithText} of ${upload.pagesTotal}`} />
        <Stat label="Chunks indexed" value={String(index.chunks.length)} />
        <Stat label="Split in browser" value={ms(upload.splitMs)} />
        <Stat label="Extract (server)" value={ms(upload.extractMs)} />
        <Stat label="Upload round trip" value={ms(upload.uploadMs)} />
        <Stat label="Embed chunks" value={ms(index.latency_ms.embed)} />
        <Stat label="Suggestions" value={ms(index.latency_ms.suggest)} />
        <Stat label="Embedding tokens" value={String(index.usage.embedding_tokens)} />
        <Stat label="Chat tokens in / out" value={`${index.usage.input_tokens} / ${index.usage.output_tokens}`} />
        <Stat label="Indexing cost" value={usd(index.usage.estimated_cost_usd)} />
      </dl>
      {upload.truncated || index.chunk_limit_reached ? (
        <p className="text-muted">
          The session index holds up to 300 chunks, so pages 1 to {index.last_indexed_page} of {upload.pagesTotal} were indexed. Questions about later pages may not be found.
        </p>
      ) : null}
    </div>
  );
}

function PdfAnswer({ result, question }: { result: AskResponse; question: string }) {
  const total = result.latency_ms.embed + result.latency_ms.retrieve + result.latency_ms.rerank + result.latency_ms.generate;
  return (
    <div className="rise space-y-4">
      <article className="panel overflow-hidden">
        <div className="border-b border-line bg-wash/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Answer</p>
          <h3 className="mt-1 text-xl">{question}</h3>
        </div>
        <p className="whitespace-pre-line px-5 py-5 text-base leading-7">{result.answer}</p>
        <p className="border-t border-line px-5 py-3 text-sm text-muted">
          {result.found ? `Cited pages: ${result.citations.join(", ")}.` : "The retrieved passages do not support an answer."}
        </p>
      </article>
      <dl className="panel grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
        <Stat label="Embed question" value={ms(result.latency_ms.embed)} />
        <Stat label="Retrieve (cosine + BM25 + RRF)" value={ms(result.latency_ms.retrieve)} />
        <Stat label={result.reranked ? "Rerank (gpt-4o-mini)" : "Rerank (skipped)"} value={ms(result.latency_ms.rerank)} />
        <Stat label="Generate" value={ms(result.latency_ms.generate)} />
        <Stat label="Server total" value={ms(total)} />
        <Stat label="Embedding tokens" value={String(result.usage.embedding_tokens)} />
        <Stat label="Chat tokens in / out" value={`${result.usage.input_tokens} / ${result.usage.output_tokens}`} />
        <Stat label="Cost of this answer" value={usd(result.usage.estimated_cost_usd)} />
      </dl>
      <div className="panel p-4">
        <h3 className="text-lg">Top passages {result.reranked ? "after rerank" : "after fusion"}</h3>
        <ol className="mt-3 space-y-3">
          {result.passages.map((item) => (
            <li key={item.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-semibold">
                {item.rank}. Page {item.page}
              </p>
              <p className="mt-1 text-xs text-muted tabular-nums">
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
