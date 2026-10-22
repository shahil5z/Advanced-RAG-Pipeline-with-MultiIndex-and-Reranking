import Link from "next/link";

import { Pipeline } from "@/components/Pipeline";
import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";
import { GITHUB_URL } from "@/lib/site";

const stack = [
  { name: "Python", detail: "Pipeline, chunking, and the ragcheck command line." },
  { name: "FAISS", detail: "Flat, HNSW, and IVF indexes, searched by L2 distance." },
  { name: "BM25", detail: "Reranks retrieved chunks. A larger score ranks higher." },
  { name: "MiniLM", detail: "all-MiniLM-L6-v2 embeddings for the local benchmark." },
  { name: "Next.js", detail: "The public demo, query route, and evaluation view." },
  { name: "Vercel", detail: "Hosts the site from the web directory." },
];

export default function HomePage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const questions = experiments[0]?.questions ?? 0;

  return (
    <div>
      <section className="on-dark bg-navy text-white">
        <div className="shell flex flex-col items-center gap-8 pt-14 pb-20 text-center sm:pt-20 sm:pb-24 lg:flex-row lg:items-center lg:gap-14 lg:text-left">
          <img
            src="/logo.png"
            alt="RAGCHECK logo"
            width={200}
            height={200}
            className="rise h-40 w-40 rounded-2xl shadow-lift ring-4 ring-white/15 sm:h-48 sm:w-48"
          />
          <div className="rise rise-2 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Retrieval evaluation</p>
            <h1 className="mt-3 text-4xl text-balance text-white sm:text-5xl">Measure retrieval before trusting the answer.</h1>
            <p className="mt-4 text-lg leading-8 text-white/80">
              A multi-index RAG pipeline with BM25 reranking, and a benchmark of {questions} reviewed questions.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/demo" className="btn-on-dark">
                Try the demo
              </Link>
              <a href={GITHUB_URL} className="btn-on-dark-ghost">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {flat && plain ? (
        <div className="shell relative z-10 -mt-8">
          <dl className="rise rise-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-line shadow-lift sm:grid-cols-4">
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">Recall@5</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.recall_at_k.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">Flat and HNSW, with or without BM25</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">MRR with BM25</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums text-accent">{flat.mrr.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">From {plain.mrr.toFixed(3)} when reranking is off</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">nDCG with BM25</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.ndcg.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">From {plain.ndcg.toFixed(3)} on the same hits</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">Median retrieval</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.retrieval_p50_ms.toFixed(1)}<span className="ml-1 text-base text-muted">ms</span></dd>
              <dd className="mt-1 text-xs leading-5 text-muted">Flat with BM25</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="shell space-y-20 py-16">
        <Pipeline />

        <section className="space-y-6" aria-labelledby="stack-heading">
          <div className="max-w-2xl">
            <h2 id="stack-heading" className="text-3xl">
              Stack
            </h2>
            <p className="mt-2 text-base leading-7 text-muted">What the local package uses, and what the public site is built with.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map((item) => (
              <li key={item.name} className="panel p-5">
                <h3 className="text-xl">{item.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl">What runs in the browser</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The live demo searches six lab-note passages with hashed token vectors and can rerank them with BM25.
              PyTorch, sentence-transformers, and FAISS stay in the local package.
              Set <code className="rounded bg-wash px-1.5 py-0.5">OPENAI_API_KEY</code> on the server to switch embeddings and the written answer to OpenAI.
              The {experimentLabel("flat_baseline")}, HNSW, and IVF figures are the stored local run.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/evaluation" className="btn-primary">
              Read the benchmark
            </Link>
            <Link href="/about" className="btn-ghost">
              Architecture notes
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
