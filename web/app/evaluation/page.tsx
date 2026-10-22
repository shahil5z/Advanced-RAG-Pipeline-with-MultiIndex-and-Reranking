import type { Metadata } from "next";

import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";

export const metadata: Metadata = {
  title: "Evaluation",
  description: "Page-level Recall, MRR, nDCG, and citation precision for Flat, HNSW, and IVF.",
};

export default function EvaluationPage() {
  if (experiments.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-4xl">Evaluation</h1>
        <p className="rounded-lg border border-dashed border-line bg-card px-4 py-6 text-sm leading-6 text-muted">
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
  const maxMrr = Math.max(...experiments.map((row) => row.mrr), 0.01);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-4xl">Evaluation</h1>
        <p className="text-base leading-7 text-muted">
          Page-level retrieval on {sample.questions} reviewed questions. K is {sample.k}. These figures are the local FAISS benchmark
          with {sample.embedding_model}, chunk size {sample.chunk_size}. Judge scores were not part of this run.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="px-4 py-3 text-left text-sm text-muted">
            Retrieval metrics. Citation precision uses the number of distinct cited pages as the denominator.
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-4 py-2 font-semibold">
                Configuration
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Recall
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Precision
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                MRR
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                nDCG
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Citation precision
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
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

      <section className="max-w-2xl space-y-4">
        <h2 className="text-2xl">MRR by configuration</h2>
        <p className="text-sm leading-6 text-muted">
          Median retrieval on this corpus sits within about a millisecond across the four runs, so the chart shows MRR, the metric BM25 moved.
        </p>
        <div className="space-y-3" role="img" aria-label="Bar chart of mean reciprocal rank for each index configuration">
          {experiments.map((row) => (
            <div key={row.name} className="grid grid-cols-[7.5rem_1fr_3.25rem] items-center gap-3 sm:grid-cols-[9rem_1fr_3.25rem]">
              <span className="text-sm">{experimentLabel(row.name)}</span>
              <div className="h-2.5 rounded-full bg-mist">
                <div className="h-2.5 rounded-full bg-pine" style={{ width: `${(row.mrr / maxMrr) * 100}%` }} />
              </div>
              <span className="text-right text-sm tabular-nums">{row.mrr.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </section>

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
