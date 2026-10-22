import type { Metadata } from "next";
import { Suspense } from "react";

import { Demo } from "@/components/Demo";
import { PdfQa } from "@/components/PdfQa";
import { QuotaBadge } from "@/components/QuotaBadge";
import corpus from "@/data/corpus.json";
import demo from "@/data/demo.json";

export const metadata: Metadata = {
  title: "Demo",
  description: "Upload a PDF and ask questions about it live, or query the built-in lab notes.",
};

export default function DemoPage() {
  const questions = demo.examples.map((item) => item.question);
  return (
    <>
      <div className="shell space-y-8 py-10 sm:py-14">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Live demo</p>
          <h1 className="text-4xl text-balance sm:text-5xl">
            Ask questions about <span className="gradient-text">your own PDF</span>
          </h1>
          <p className="text-base leading-7 text-muted">
            Upload a PDF up to 10 MB. The server extracts the text, splits it into overlapping chunks with page numbers, and embeds them with text-embedding-3-small. Each question is matched by cosine similarity and BM25, fused with reciprocal rank fusion, optionally reranked, and answered by gpt-4o-mini with page citations. The index lives in this browser tab only. Timings, tokens and cost are measured for each request.
          </p>
          <QuotaBadge />
        </header>
        <section aria-label="PDF question answering">
          <PdfQa />
        </section>
      </div>
      <section className="shell py-10" aria-labelledby="lab-heading">
        <Suspense fallback={<p className="py-14 text-sm text-muted">Loading the lab-note demo…</p>}>
          <Demo questions={questions} />
        </Suspense>
      </section>
      <section className="shell pb-4" aria-labelledby="corpus-heading">
        <h2 id="corpus-heading" className="text-2xl">
          Lab-note corpus
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          These six passages are the default index. Page numbers are zero-based. Pasted text replaces them for a single request and is not stored.
        </p>
        <ol className="mt-4 space-y-3">
          {corpus.pages.map((page) => (
            <li key={page.page} className="panel p-4">
              <p className="text-sm font-semibold">
                {corpus.document}, page {page.page}
              </p>
              <p className="mt-2 text-sm leading-6">{page.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
