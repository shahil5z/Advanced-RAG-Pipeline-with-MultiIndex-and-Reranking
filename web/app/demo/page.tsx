import type { Metadata } from "next";
import { Suspense } from "react";

import { Demo } from "@/components/Demo";
import corpus from "@/data/corpus.json";
import demo from "@/data/demo.json";

export const metadata: Metadata = {
  title: "Demo",
  description: "Search the lab notes with Flat, HNSW-style, or IVF-style retrieval, and compare BM25 on and off.",
};

export default function DemoPage() {
  const questions = demo.examples.map((item) => item.question);
  return (
    <>
      <Suspense fallback={<p className="shell py-14 text-sm text-muted">Loading the demo…</p>}>
        <Demo questions={questions} />
      </Suspense>
      <section className="shell pb-4" aria-labelledby="corpus-heading">
        <h2 id="corpus-heading" className="text-3xl">
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
