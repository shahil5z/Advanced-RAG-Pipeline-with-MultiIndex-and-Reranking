import type { Metadata } from "next";

import { GITHUB_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "How the local FAISS pipeline and the public Vercel demo fit together.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
      <header className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <img src="/logo.png" alt="RAGCHECK logo" width={128} height={128} className="h-28 w-28 rounded-2xl shadow-card" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Portfolio</p>
          <h1 className="mt-2 text-4xl">About</h1>
          <p className="mt-3 text-base leading-7 text-muted">
            Shahil Haque built this as a portfolio of retrieval work: a reproducible Python pipeline, a scored benchmark, and a public demo that a reviewer can run.
          </p>
        </div>
      </header>

      <section className="space-y-3 text-sm leading-6">
        <h2 className="text-2xl">Local research stack</h2>
        <p>
          PDFs are split into pages, chunked, and embedded with all-MiniLM-L6-v2. Those vectors are not normalized. Flat, HNSW, and IVF indexes are built with FAISS and searched by L2 distance.
          BM25 reranks the retrieved chunks by their row in the full corpus. OpenAI is the local generator, and the prompt includes the retrieved text. The key is <code className="rounded bg-wash px-1.5 py-0.5">OPENAI_API_KEY</code> from the process environment.
        </p>
        <p>
          Retrieval metrics are page-level Recall, Precision, MRR, nDCG, and citation precision. A drop larger than 0.05 against the stored flat baseline fails <code className="rounded bg-wash px-1.5 py-0.5">ragcheck ci</code>.
          Optional judge scores are cached and are separate from the stored table.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-6">
        <h2 className="text-2xl">Public demo</h2>
        <p>
          The site is a Next.js app deployed from the <code className="rounded bg-wash px-1.5 py-0.5">web</code> directory. <code className="rounded bg-wash px-1.5 py-0.5">POST /api/query</code> ingests the six lab-note passages, embeds them, runs exact search, and reranks with BM25.
          Hashed token vectors keep the function small. With an API key, the same route calls OpenAI for embeddings and the answer. The key stays on the server.
        </p>
        <p>
          The benchmark PDFs are used for the local run. The public corpus is a short note written for the site, so the demo does not depend on redistributing those reports.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-6">
        <h2 className="text-2xl">Limits worth knowing</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Forty questions and one clean source report, plus a distractor PDF whose OCR was not used to write questions.</li>
          <li>A page label is wider than a single sentence, so a hit can be relevant and still be a coarse citation.</li>
          <li>IVF with 100 lists is undertrained on 1,177 vectors. The score is for this corpus.</li>
          <li>The stored table does not grade generated answers. OpenAI output is not deterministic.</li>
          <li>Index latency here is a few milliseconds. It is not a scaling result.</li>
        </ul>
      </section>

      <p>
        <a className="btn-primary" href={GITHUB_URL}>
          View on GitHub
        </a>
      </p>
    </div>
  );
}
