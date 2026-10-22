import Link from "next/link";

import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";
import { GITHUB_URL } from "@/lib/site";

const steps = [
  {
    title: "Ingest",
    body: "PDFs are read one page at a time and split with stable chunk ids, so the same text stays comparable across runs.",
  },
  {
    title: "Retrieve",
    body: "Flat, HNSW, and IVF indexes search the vectors. BM25 can then reorder the hits. A larger BM25 score ranks higher.",
  },
  {
    title: "Measure",
    body: "Recall, precision, MRR, nDCG, and citation precision are scored against labeled pages, not against one example answer.",
  },
];

export default function HomePage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const questions = experiments[0]?.questions ?? 0;

  return (
    <div className="space-y-12">
      <header className="max-w-3xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-pine">Retrieval evaluation</p>
        <h1 className="text-4xl text-balance sm:text-5xl">Measure retrieval before trusting the answer.</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          A local multi-index RAG pipeline, plus a public demo of the same stages: ingest, exact search, BM25 reranking, and a grounded answer.
          The benchmark scores {questions} reviewed questions.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/demo" className="btn-primary">
            Try the demo
          </Link>
          <Link href="/evaluation" className="btn-ghost">
            Read the benchmark
          </Link>
          <a href={GITHUB_URL} className="btn-ghost">
            View source
          </a>
        </div>
      </header>

      {flat && plain ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-card p-4">
            <dt className="text-sm text-muted">Recall@5</dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.recall_at_k.toFixed(3)}</dd>
            <dd className="mt-1 text-xs text-muted">Flat and HNSW, with or without BM25</dd>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <dt className="text-sm text-muted">MRR with BM25</dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.mrr.toFixed(3)}</dd>
            <dd className="mt-1 text-xs text-muted">From {plain.mrr.toFixed(3)} when reranking is off</dd>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <dt className="text-sm text-muted">nDCG with BM25</dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.ndcg.toFixed(3)}</dd>
            <dd className="mt-1 text-xs text-muted">From {plain.ndcg.toFixed(3)} on the same hits</dd>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <dt className="text-sm text-muted">Median retrieval</dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.retrieval_p50_ms.toFixed(1)}</dd>
            <dd className="mt-1 text-xs text-muted">Milliseconds, Flat with BM25</dd>
          </div>
        </dl>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-2xl">What the pipeline does</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-line bg-card p-4">
              <p className="text-sm font-semibold text-pine">0{index + 1}</p>
              <h3 className="mt-2 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-3xl space-y-3 rounded-lg border border-line bg-card p-5">
        <h2 className="text-2xl">What runs on the public site</h2>
        <p className="text-sm leading-6 text-muted">
          The live demo ingests the short lab-note corpus, embeds it, searches a flat index, and reranks with BM25 inside a Vercel function.
          PyTorch, sentence-transformers, and FAISS stay in the local Python package: the model download and native wheels are a poor fit for a default serverless bundle.
          The public index uses hashed token vectors. Set <code className="rounded bg-mist px-1.5 py-0.5">OPENAI_API_KEY</code> on the server to switch embeddings and generation to OpenAI.
          The {experimentLabel("flat_baseline")}, HNSW, and IVF numbers on the evaluation page are the stored local run.
        </p>
        <p className="text-sm leading-6">
          <Link href="/about" className="font-semibold text-pine underline decoration-pine/40 underline-offset-4">
            Read the architecture notes
          </Link>
        </p>
      </section>
    </div>
  );
}
