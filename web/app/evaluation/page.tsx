import type { Metadata } from "next";

import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";

export const metadata: Metadata = {
  title: "Evaluation",
  description: "Page-level Recall, MRR, nDCG, and citation precision for Flat, HNSW, and IVF.",
};

const series = [
  { key: "recall_at_k" as const, label: "Recall@5", swatch: "bg-navy" },
  { key: "mrr" as const, label: "MRR", swatch: "bg-accent" },
  { key: "ndcg" as const, label: "nDCG", swatch: "bg-steel" },
];

export default function EvaluationPage() {
  if (experiments.length === 0) {
    return (
      <div className="shell space-y-3 py-14">
        <h1 className="text-4xl">Evaluation</h1>
        <p className="panel border-dashed px-5 py-8 text-sm leading-6 text-muted">
          No evaluation results are available. Run a local evaluation to populate this view.
        </p>
      </div>
    );
  }

  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const ivf = findExperiment("ivf");
  const hnsw = findExperiment("hnsw");
  const sample = experiments[0];

  return (
    <div className="shell space-y-10 py-10 sm:py-14">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Stored benchmark</p>
        <h1 className="text-4xl sm:text-5xl">Evaluation</h1>
        <p className="text-base leading-7 text-muted">
          Page-level retrieval on {sample.questions} reviewed questions. K is {sample.k}. These figures are the local FAISS benchmark
          with {sample.embedding_model}, chunk size {sample.chunk_size}. Judge scores were not part of this run.
        </p>
      </header>

      {flat && plain ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel p-5">
            <p className="text-sm text-muted">Recall@{flat.k} stayed</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{flat.recall_at_k.toFixed(3)}</p>
            <p className="mt-1 text-xs leading-5 text-muted">BM25 changed order, not coverage.</p>
          </div>
          <div className="panel p-5">
            <p className="text-sm text-muted">MRR rose to</p>
            <p className="mt-2 font-serif text-3xl tabular-nums text-accent">{flat.mrr.toFixed(3)}</p>
            <p className="mt-1 text-xs leading-5 text-muted">From {plain.mrr.toFixed(3)} with reranking off.</p>
          </div>
          <div className="panel p-5">
            <p className="text-sm text-muted">nDCG rose to</p>
            <p className="mt-2 font-serif text-3xl tabular-nums">{flat.ndcg.toFixed(3)}</p>
            <p className="mt-1 text-xs leading-5 text-muted">From {plain.ndcg.toFixed(3)} on the same hits.</p>
          </div>
        </section>
      ) : null}

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl">Recall, MRR, and nDCG</h2>
          <ul className="flex flex-wrap gap-3 text-xs font-semibold text-muted">
            {series.map((item) => (
              <li key={item.key} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${item.swatch}`} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Bars are scaled to 1. Median retrieval on this corpus sits within about a millisecond, so the chart shows ranking quality.
        </p>
        <div className="mt-6 space-y-5" role="img" aria-label="Grouped bar chart of recall, mean reciprocal rank, and nDCG for each index configuration">
          {experiments.map((row) => (
            <div key={row.name} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center">
              <p className="text-sm font-semibold">{experimentLabel(row.name)}</p>
              <div className="space-y-1.5">
                {series.map((item) => {
                  const value = row[item.key];
                  return (
                    <div key={item.key} className="grid grid-cols-[4.5rem_1fr_3.25rem] items-center gap-2">
                      <span className="text-xs text-muted">{item.label}</span>
                      <div className="h-2 rounded-full bg-wash">
                        <div className={`h-2 rounded-full ${item.swatch}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
                      </div>
                      <span className="text-right text-xs tabular-nums">{value.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="px-4 py-3 text-left text-sm text-muted">
            Retrieval metrics. Citation precision uses the number of distinct cited pages as the denominator.
          </caption>
          <thead>
            <tr className="border-b border-line bg-wash text-left">
              <th scope="col" className="px-4 py-3 font-semibold">
                Configuration
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Recall
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Precision
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                MRR
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                nDCG
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Citation precision
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Median retrieval
              </th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((row) => (
              <tr key={row.name} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  {experimentLabel(row.name)}
                </th>
                <td className="px-3 py-3 tabular-nums">{row.recall_at_k.toFixed(3)}</td>
                <td className="px-3 py-3 tabular-nums">{row.precision_at_k.toFixed(3)}</td>
                <td className="px-3 py-3 tabular-nums">{row.mrr.toFixed(3)}</td>
                <td className="px-3 py-3 tabular-nums">{row.ndcg.toFixed(3)}</td>
                <td className="px-3 py-3 tabular-nums">{row.citation_precision.toFixed(3)}</td>
                <td className="px-4 py-3 tabular-nums">{row.retrieval_p50_ms.toFixed(1)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="max-w-3xl space-y-3 text-sm leading-6">
        <h2 className="text-2xl">On this corpus</h2>
        {flat && plain ? (
          <p>
            BM25 left Recall@{flat.k} at {flat.recall_at_k.toFixed(3)}. It raised MRR from {plain.mrr.toFixed(3)} to {flat.mrr.toFixed(3)} and nDCG from{" "}
            {plain.ndcg.toFixed(3)} to {flat.ndcg.toFixed(3)}, so relevant pages moved higher in the list.
          </p>
        ) : null}
        {hnsw && ivf && flat ? (
          <p>
            {experimentLabel(hnsw.name)} matched Flat on the reported metrics. {experimentLabel(ivf.name)} scored Recall@{ivf.k} of {ivf.recall_at_k.toFixed(3)}.
            FAISS warned that 1,177 vectors are few for 100 lists. That is a result for this corpus.
          </p>
        ) : null}
        <p>
          Citation precision is the share of distinct cited pages that were labeled relevant. With reranking it is about{" "}
          {flat ? flat.citation_precision.toFixed(3) : "0.229"}. Precision@{sample.k} divides by {sample.k}, so the two numbers differ when fewer than {sample.k} distinct pages come back.
        </p>
      </section>
    </div>
  );
}
