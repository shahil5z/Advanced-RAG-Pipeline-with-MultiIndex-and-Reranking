import type { Metadata } from "next";

import { ArchitectureDiagram } from "@/components/Diagram";

export const metadata: Metadata = {
  title: "Architecture",
  description: "Local service boundary, data flow, and why each component is there.",
};

const reasons = [
  ["FAISS", "The stored benchmark already uses Flat, HNSW, and IVF. Keeping that index makes the regression gate comparable."],
  ["Qdrant or pgvector", "Qdrant is the persistent local default because the process can filter metadata without a paid database. pgvector is the alternative when Postgres is already the local system of record. It is not a second benchmark."],
  ["BM25", "On the stored run it changed order, not coverage. Recall@5 stayed 0.833."],
  ["Hybrid retrieval", "Dense search and BM25 propose different candidates. Reciprocal rank fusion keeps both before a short rerank. On the 40 questions RRF raised Recall@5 from 0.833 to 0.858, and RRF with a BM25 rerank reached MRR 0.821, at a higher local latency."],
  ["FastAPI", "The HTTP boundary is separate from the library so health, retrieval, and evaluation can be tested without a browser."],
  ["OpenTelemetry", "A local collector can show where time went. Tests use an in-memory exporter and do not need Jaeger."],
  ["Kubernetes", "The manifests are a local demonstration for kind or minikube: probes, requests, and limits. They are not a cluster you can hand to an operator as production."],
  ["OpenAI behind an interface", "Generation is optional and server-side. Retrieval metrics do not depend on it. The public site does not need a key."],
  ["Not production-ready", "The zero-cost scope excludes distributed state, authentication, managed infrastructure, and a compliance program. Those are the reasons this repository does not claim to be production-ready."],
];

export default function ArchitecturePage() {
  return (
    <div className="shell space-y-10 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Architecture</h1>
        <p className="leading-7 text-muted">
          Public mode is this Next.js site and prepared JSON. Local engineering mode is the Python package, FastAPI, Qdrant, and a local collector. The two do not share a process on Vercel.
        </p>
      </header>

      <ArchitectureDiagram />

      <section className="space-y-3">
        <h2 className="text-2xl">Components</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Library", "Chunking, FAISS indexes, BM25, metrics, and the regression gate."],
            ["API", "GET /health, GET /ready, GET /version, POST /query, POST /retrieve, POST /evaluate."],
            ["Stores", "Memory for tests, FAISS for the benchmark shape, Qdrant when QDRANT_URL is set."],
            ["Events", "SQLite rows with tokens, latency, status, and error type. Prompts are off unless enabled."],
            ["Public route", "POST /api/query and /api/pdf/* in the Next.js app. Live OpenAI embeddings and gpt-4o-mini answers over six lab notes, pasted text, or an uploaded PDF, limited to 15 tests per browser per day."],
          ].map(([name, detail]) => (
            <div key={name} className="border border-line bg-card px-4 py-3">
              <dt className="font-semibold">{name}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Data flow</h2>
        <ol className="list-decimal space-y-2 pl-5 leading-7">
          <li>A question is length-checked and screened for a small set of injection phrases.</li>
          <li>The local service embeds it with a deterministic hash. The benchmark uses MiniLM instead.</li>
          <li>Dense search and BM25 each return a candidate list. Filters apply to both.</li>
          <li>Reciprocal rank fusion merges the lists. BM25 can rerank that fused set only.</li>
          <li>The answer quotes a passage and a citation, or a fixed fallback when nothing was retrieved.</li>
          <li>A request row records latency and status. A span can be exported if a collector is configured.</li>
        </ol>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Local deployment</h2>
        <p className="leading-7 text-muted">
          Docker Compose starts the API, Qdrant, a collector, Jaeger, and Prometheus. Grafana is a profile, not a default. Kubernetes manifests under k8s/ are for a local cluster. See docs/LOCAL.md. The key is read from the process environment and is not written into those files.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl">Why</h2>
        <dl className="space-y-4">
          {reasons.map(([name, detail]) => (
            <div key={name}>
              <dt className="font-semibold">{name}</dt>
              <dd className="mt-1 max-w-3xl leading-7 text-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
