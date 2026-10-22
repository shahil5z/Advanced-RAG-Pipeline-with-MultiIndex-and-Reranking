import benchmark from "@/data/benchmark.json";

type Experiment = {
  name: string;
  recall_at_k: number;
  precision_at_k: number;
  mrr: number;
  ndcg: number;
  citation_precision: number;
  retrieval_mean_ms: number;
  retrieval_p50_ms: number;
  questions: number;
  k: number;
};

const rows = benchmark.experiments as Experiment[];

export default function EvaluationPage() {
  if (rows.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Evaluation</h1>
        <p className="text-sm">No evaluation results are available. Run a local evaluation to populate this view.</p>
      </div>
    );
  }
  const maxLatency = Math.max(...rows.map((row) => row.retrieval_p50_ms), 1);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Evaluation</h1>
      <p className="text-sm text-stone-700">
        Page-level retrieval on {rows[0].questions} reviewed questions. K is {rows[0].k}. These figures are from the local benchmark, not from the public demo corpus. LLM-judge scores were not measured.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-400 text-left">
              <th className="py-2 pr-3">Configuration</th>
              <th className="py-2 pr-3">Recall</th>
              <th className="py-2 pr-3">MRR</th>
              <th className="py-2 pr-3">nDCG</th>
              <th className="py-2 pr-3">Citation precision</th>
              <th className="py-2">Median retrieval</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-stone-200">
                <td className="py-2 pr-3">{row.name}</td>
                <td className="py-2 pr-3">{row.recall_at_k.toFixed(3)}</td>
                <td className="py-2 pr-3">{row.mrr.toFixed(3)}</td>
                <td className="py-2 pr-3">{row.ndcg.toFixed(3)}</td>
                <td className="py-2 pr-3">{row.citation_precision.toFixed(3)}</td>
                <td className="py-2">{row.retrieval_p50_ms.toFixed(1)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="font-semibold">Quality and latency</h2>
        <svg viewBox="0 0 320 180" className="mt-3 w-full max-w-md border border-stone-300 bg-white" role="img" aria-label="Recall against mean retrieval latency">
          {rows.map((row) => {
            const x = 40 + (row.retrieval_p50_ms / maxLatency) * 250;
            const y = 150 - row.recall_at_k * 130;
            return (
              <g key={row.name}>
                <circle cx={x} cy={y} r="4" fill="#1c1b19" />
                <text x={x + 6} y={y} fontSize="10">
                  {row.name}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-xs text-stone-600">
          Horizontal position is median retrieval time. Vertical position is recall. These gaps are about 1 ms on this corpus.
        </p>
      </section>
      <section className="space-y-2 text-sm leading-6">
        <h2 className="font-semibold">On this corpus</h2>
        <p>BM25 did not change Recall@5 (0.833). It raised MRR from 0.629 to 0.779 and nDCG from 0.670 to 0.784, so relevant pages moved higher in the list.</p>
        <p>HNSW matched Flat. IVF, still using the original 100 lists, scored Recall@5 of 0.796. FAISS warned that 1,177 vectors are few for that setting. That is a result for this corpus, not a general ranking of index types.</p>
        <p>Citation precision is the share of distinct cited pages that were labeled relevant. Here it is about 0.229 with reranking. It is not answer accuracy. Precision@5 divides by 5, so it is lower when fewer than five distinct pages are returned.</p>
      </section>
    </div>
  );
}
