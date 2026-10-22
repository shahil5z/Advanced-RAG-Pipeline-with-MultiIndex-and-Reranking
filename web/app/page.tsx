import Link from "next/link";

import { Pipeline } from "@/components/Pipeline";
import { experiments, findExperiment } from "@/lib/benchmark";
import { GITHUB_URL } from "@/lib/site";

const stack = [
  { name: "FAISS", detail: "Flat, HNSW, and IVF indexes in the local Python package, searched by L2." },
  { name: "BM25", detail: "Reranks the retrieved chunks. A larger score moves a passage up." },
  { name: "Recall, MRR, nDCG", detail: "Page-level scores on 40 labeled questions, plus citation precision." },
  { name: "MiniLM", detail: "all-MiniLM-L6-v2 embeddings for the stored benchmark." },
  { name: "Next.js", detail: "Public demo, query route, and evaluation view." },
  { name: "Vercel", detail: "Hosts the site from the web directory. The live index is hashed tokens, not FAISS." },
];

export default function HomePage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const ivf = findExperiment("ivf");
  const questions = experiments[0]?.questions ?? 0;

  return (
    <div>
      <section className="on-dark bg-navy text-white">
        <div className="shell flex flex-col items-center gap-8 pt-12 pb-24 text-center sm:pt-16 lg:flex-row lg:items-center lg:gap-14 lg:text-left">
          <img
            src="/logo.png"
            alt="RAGCHECK logo"
            width={200}
            height={200}
            className="rise h-40 w-40 rounded-2xl shadow-lift ring-4 ring-white/15 sm:h-48 sm:w-48"
          />
          <div className="rise rise-2 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Advanced RAG pipeline</p>
            <h1 className="mt-3 text-4xl text-balance text-white sm:text-5xl">Compare Flat, HNSW, and IVF. Then measure what came back.</h1>
            <p className="mt-4 text-lg leading-8 text-white/80">
              Retrieves with three FAISS indexes, reranks the hits with BM25, and scores quality with Recall@k, MRR, and nDCG.
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
        <div className="shell relative z-10 -mt-10">
          <div className="rise rise-3 overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
            <h2 className="px-5 pt-4 text-sm font-semibold text-muted">Key results</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4">
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">Recall@{flat.k}</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.recall_at_k.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">Unchanged when BM25 is turned on. {questions} questions.</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">MRR with BM25</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums text-accent">{flat.mrr.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">From {plain.mrr.toFixed(3)} with reranking off.</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">nDCG with BM25</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{flat.ndcg.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">From {plain.ndcg.toFixed(3)} on the same hits.</dd>
            </div>
            <div className="bg-card p-5">
              <dt className="text-sm text-muted">IVF Recall@{ivf?.k ?? flat.k}</dt>
              <dd className="mt-2 font-serif text-3xl tabular-nums">{(ivf ?? flat).recall_at_k.toFixed(3)}</dd>
              <dd className="mt-1 text-xs leading-5 text-muted">Below Flat on this corpus. HNSW matched Flat.</dd>
            </div>
          </dl>
          </div>
        </div>
      ) : null}

      <div className="shell space-y-20 py-16">
        <section className="space-y-6" aria-labelledby="does-heading">
          <h2 id="does-heading" className="text-3xl">
            What this project does
          </h2>
          <ol className="grid gap-4 lg:grid-cols-3">
            <li className="panel p-5">
              <p className="text-sm font-semibold text-accent">Problem</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                One nearest-neighbor distance does not show whether the right page was retrieved, or whether another index would have done better.
              </p>
            </li>
            <li className="panel p-5">
              <p className="text-sm font-semibold text-accent">Approach</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                The same chunks are searched with FAISS Flat, HNSW, and IVF. BM25 can reorder those hits. Recall@k, MRR, nDCG, and citation precision are scored against labeled pages.
              </p>
            </li>
            <li className="panel p-5">
              <p className="text-sm font-semibold text-accent">Results</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {flat && plain
                  ? `BM25 left Recall@${flat.k} at ${flat.recall_at_k.toFixed(3)} and raised MRR from ${plain.mrr.toFixed(3)} to ${flat.mrr.toFixed(3)} and nDCG from ${plain.ndcg.toFixed(3)} to ${flat.ndcg.toFixed(3)}. Relevant pages moved up. They were not new hits.`
                  : "BM25 changed rank, not coverage."}
              </p>
            </li>
          </ol>
        </section>

        <section className="space-y-4" aria-labelledby="how-heading">
          <div className="max-w-2xl">
            <h2 id="how-heading" className="text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-base leading-7 text-muted">
              A PDF is split into chunks and embedded. An index finds the nearest chunks. BM25 may reorder them. The answer is written from those passages, and the ranks are scored against the pages that were labeled relevant.
            </p>
          </div>
          <Pipeline />
        </section>

        <section className="space-y-6" aria-labelledby="stack-heading">
          <h2 id="stack-heading" className="text-3xl">
            Stack
          </h2>
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
            <h2 className="text-3xl">Try it on a short corpus</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The public demo searches six lab-note passages. You can switch Flat, HNSW-style, and IVF-style search, move top-k, compare BM25 on and off, and paste your own text for one request.
              PyTorch and FAISS stay in the local package. The numbers above are that local run.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/demo" className="btn-primary">
              Open the demo
            </Link>
            <Link href="/evaluation" className="btn-ghost">
              Read the benchmark
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
