import Link from "next/link";

import { ArchitectureDiagram } from "@/components/Diagram";
import { findExperiment } from "@/lib/benchmark";
import { metric, millis } from "@/lib/format";
import { GITHUB_URL } from "@/lib/site";

const capabilities = [
  ["FastAPI", "Health, readiness, retrieve, query, and evaluate on the local package."],
  ["Hybrid retrieval", "Dense candidates and BM25 candidates, fused with reciprocal rank fusion."],
  ["Qdrant / pgvector", "Qdrant is the persistent local default. pgvector is the documented alternative."],
  ["OpenTelemetry", "Spans for the request path, exported to a local collector when configured."],
  ["Guardrails", "Length, injection checks, context bounds, and grounded citations."],
  ["Kubernetes", "Local manifests for kind or minikube. Not a managed cluster."],
  ["CI", "Tests, lint, types, audit, secret scan, retrieval gate, web build, image build."],
];

export default function HomePage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  if (!flat || !plain) {
    return (
      <div className="shell py-14">
        <h1 className="text-4xl">Advanced RAG Evaluation Platform</h1>
        <p className="mt-3 text-muted">Stored benchmark results are missing.</p>
      </div>
    );
  }

  return (
    <div className="shell space-y-10 py-10 sm:py-14">
      <header className="grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
        <img src="/logo.png" alt="Project logo" width={200} height={200} className="h-40 w-40 rounded-2xl border border-line bg-card p-2 shadow-lift ring-4 ring-violet/20 sm:h-48 sm:w-48" />
        <div className="max-w-2xl">
          <h1 className="text-4xl text-balance sm:text-5xl"><span className="gradient-text">Advanced RAG</span> Evaluation Platform</h1>
          <p className="mt-4 text-lg leading-8 text-muted">A reproducible retrieval and generation evaluation system for document-grounded AI.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/evaluation" className="btn-primary">
              Explore Evaluation
            </Link>
            <Link href="/demo" className="btn-ghost">
              Try Demo
            </Link>
          </div>
        </div>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card sm:grid-cols-4">
        {[
          ["Recall@5", metric(flat.recall_at_k)],
          ["MRR", metric(flat.mrr)],
          ["nDCG", metric(flat.ndcg)],
          ["Median retrieval", millis(flat.retrieval_p50_ms)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums text-navy dark:text-violet">{value}</dd>
          </div>
        ))}
      </dl>

      <ArchitectureDiagram />

      <section className="max-w-3xl space-y-2">
        <h2 className="text-2xl">What changed?</h2>
        <p className="leading-7">BM25 improved ranking quality without increasing Recall@5.</p>
        <p className="leading-7 text-muted">
          Flat with reranking kept Recall@5 at {metric(flat.recall_at_k)} and moved MRR from {metric(plain.mrr)} to {metric(flat.mrr)} and nDCG from {metric(plain.ndcg)} to {metric(flat.ndcg)}.
        </p>
      </section>

      <section>
        <h2 className="text-2xl">Engineering capabilities</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {capabilities.map(([name, detail]) => (
            <div key={name} className="tile px-4 py-3">
              <dt className="font-semibold">{name}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Austrian enterprise shape</h2>
        <p className="leading-7 text-muted">
          A synthetic technical-document assistant for manuals, engineering notes, public-sector text, healthcare literature, and compliance documents. The corpus in this repository is not customer data.
        </p>
        <Link href="/enterprise" className="text-sm font-semibold text-ink underline">
          Read the enterprise boundary
        </Link>
      </section>

      <p>
        <a href={GITHUB_URL} className="text-sm font-semibold underline">
          Source on GitHub
        </a>
      </p>
    </div>
  );
}
