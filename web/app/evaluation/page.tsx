import type { Metadata } from "next";
import Link from "next/link";

import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";
import { metric, millis } from "@/lib/format";
import failures from "@/data/failures.json";
import loadFile from "@/data/load-test.json";
import extended from "@/data/extended.json";

type LoadRow = {
  requests: number;
  concurrency: number;
  rps: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
};

const load = loadFile as {
  status: string;
  note?: string;
  method?: string;
  health?: LoadRow;
  retrieve?: LoadRow;
};

export const metadata: Metadata = {
  title: "Evaluation",
  description: "Stored retrieval benchmark, hybrid retrieval, model comparison, cost, and failure analysis.",
};

const hybridLabels: Record<string, string> = {
  dense_flat: "Dense only (flat)",
  dense_flat_bm25_rerank: "Dense + BM25 rerank (flat_baseline)",
  bm25_only: "BM25 only",
  hybrid_rrf: "Dense + BM25 fused with RRF",
  hybrid_rrf_bm25_rerank: "RRF + BM25 rerank",
};

const measuredOn = extended.measured_at.slice(0, 10);

function usd(value: number): string {
  return `$${value.toFixed(5)}`;
}

export default function EvaluationPage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const sample = experiments[0];

  return (
    <div className="shell space-y-12 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Evaluation</h1>
        <p className="text-base leading-7 text-muted">
          {sample ? `${sample.questions} reviewed questions, K = ${sample.k}, page-level labels.` : "No stored benchmark is available."} The first table is the stored FAISS run. Hybrid retrieval, model comparison, and cost were measured on {measuredOn} with the same 40 questions.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl">Dataset</h2>
        <p className="max-w-3xl leading-7 text-muted">
          Forty reviewed questions over the diabetes report, with Understanding Science as a distractor document. The stored index has 1,177 chunks from all-MiniLM-L6-v2. Vectors are not normalized. Labels are pages, not chunk ids.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Retrieval benchmark</h2>
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line bg-wash text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Configuration</th>
                <th className="px-3 py-2 font-semibold">Recall@5</th>
                <th className="px-3 py-2 font-semibold">MRR</th>
                <th className="px-3 py-2 font-semibold">nDCG</th>
                <th className="px-3 py-2 font-semibold">Citation precision</th>
                <th className="px-3 py-2 font-semibold">Median retrieval</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((row) => (
                <tr key={row.name} className="border-b border-line last:border-0">
                  <th className="px-3 py-2 font-semibold">{experimentLabel(row.name)}</th>
                  <td className="px-3 py-2 tabular-nums">{metric(row.recall_at_k)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.mrr)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.ndcg)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.citation_precision)}</td>
                  <td className="px-3 py-2 tabular-nums">{millis(row.retrieval_p50_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted">
          IVF kept nlist 100. FAISS warned that 1,177 vectors are below the 3,900 it asks for when training 100 lists. The IVF Recall@5 of {findExperiment("ivf") ? metric(findExperiment("ivf")!.recall_at_k) : "n/a"} is a result on this corpus.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Reranking impact</h2>
        {flat && plain ? (
          <p className="max-w-3xl leading-7">
            BM25 preserved Recall@5 at {metric(flat.recall_at_k)} while improving MRR from {metric(plain.mrr)} to {metric(flat.mrr)} and nDCG from {metric(plain.ndcg)} to {metric(flat.ndcg)}. Citation precision stayed {metric(flat.citation_precision)}.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Hybrid retrieval</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted">
          Measured {measuredOn}. Dense top {extended.setup.hybrid.dense_top_k} and BM25 top {extended.setup.hybrid.bm25_top_k}, fused with reciprocal rank fusion (k = {extended.setup.hybrid.rrf_k}), final top {extended.setup.hybrid.final_top_k}. Same {extended.setup.chunks} chunks, {extended.setup.embedding_model}, chunk size {extended.setup.chunk_size}, flat index. The two dense rows reproduce the stored benchmark exactly. Latency is local CPU time per query including query embedding.
        </p>
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line bg-wash text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Setup</th>
                <th className="px-3 py-2 font-semibold">Recall@5</th>
                <th className="px-3 py-2 font-semibold">MRR</th>
                <th className="px-3 py-2 font-semibold">nDCG</th>
                <th className="px-3 py-2 font-semibold">Median retrieval</th>
                <th className="px-3 py-2 font-semibold">p95 retrieval</th>
              </tr>
            </thead>
            <tbody>
              {extended.hybrid.map((row) => (
                <tr key={row.name} className="border-b border-line last:border-0">
                  <th className="px-3 py-2 font-semibold">{hybridLabels[row.name] ?? row.name}</th>
                  <td className="px-3 py-2 tabular-nums">{metric(row.recall_at_k)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.mrr)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.ndcg)}</td>
                  <td className="px-3 py-2 tabular-nums">{millis(row.retrieval_p50_ms)}</td>
                  <td className="px-3 py-2 tabular-nums">{millis(row.retrieval_p95_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted">
          RRF raised Recall@5 from 0.833 to 0.858, a net gain of one question: q11 and q18 moved from 0 to 1, and q30 dropped from 1 to 0. RRF with a BM25 rerank gave the best MRR and nDCG. BM25 alone matched dense Recall@5. The fused paths are slower because the current code fits BM25 on every query, and that cost is in the latency columns.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Model comparison</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted">
          Measured {measuredOn}. Each model answered all 40 questions from the same top 5 chunks (flat_baseline retrieval), temperature 0, with the repository prompt. {extended.generation.judge_model} graded each answer against the reviewed reference (correctness 0, 0.5 or 1) and against the context (faithfulness). Judge scores are model-based, not ground truth. Latency is wall time of the API call from one machine.
        </p>
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-wash text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Correctness</th>
                <th className="px-3 py-2 font-semibold">Faithfulness</th>
                <th className="px-3 py-2 font-semibold">Median latency</th>
                <th className="px-3 py-2 font-semibold">p95 latency</th>
                <th className="px-3 py-2 font-semibold">Cost per query</th>
                <th className="px-3 py-2 font-semibold">40 questions</th>
              </tr>
            </thead>
            <tbody>
              {extended.generation.models.map((row) => (
                <tr key={row.model} className="border-b border-line last:border-0">
                  <th className="px-3 py-2 font-semibold">{row.model}</th>
                  <td className="px-3 py-2 tabular-nums">{metric(row.correctness)}</td>
                  <td className="px-3 py-2 tabular-nums">{metric(row.faithfulness)}</td>
                  <td className="px-3 py-2 tabular-nums">{millis(row.median_latency_ms)}</td>
                  <td className="px-3 py-2 tabular-nums">{millis(row.p95_latency_ms)}</td>
                  <td className="px-3 py-2 tabular-nums">{usd(row.cost_per_query_usd)}</td>
                  <td className="px-3 py-2 tabular-nums">{usd(row.total_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Latency</h2>
        <p className="max-w-3xl leading-7 text-muted">
          The median retrieval times in the benchmark table are local FAISS times. A load smoke of the local API, when present below, is also local service time. External model latency is different and is not included.
        </p>
        {load.status === "measured" && load.health && load.retrieve ? (
          <div className="overflow-x-auto border border-line bg-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line bg-wash text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Target</th>
                  <th className="px-3 py-2 font-semibold">Requests</th>
                  <th className="px-3 py-2 font-semibold">Concurrency</th>
                  <th className="px-3 py-2 font-semibold">RPS</th>
                  <th className="px-3 py-2 font-semibold">p50</th>
                  <th className="px-3 py-2 font-semibold">p95</th>
                  <th className="px-3 py-2 font-semibold">p99</th>
                  <th className="px-3 py-2 font-semibold">Error rate</th>
                </tr>
              </thead>
              <tbody>
                {(["health", "retrieve"] as const).map((name) => {
                  const row = load[name];
                  if (!row) return null;
                  return (
                    <tr key={name} className="border-b border-line last:border-0">
                      <th className="px-3 py-2 font-semibold">{name}</th>
                      <td className="px-3 py-2 tabular-nums">{row.requests}</td>
                      <td className="px-3 py-2 tabular-nums">{row.concurrency}</td>
                      <td className="px-3 py-2 tabular-nums">{row.rps.toFixed(1)}</td>
                      <td className="px-3 py-2 tabular-nums">{millis(row.p50_ms)}</td>
                      <td className="px-3 py-2 tabular-nums">{millis(row.p95_ms)}</td>
                      <td className="px-3 py-2 tabular-nums">{millis(row.p99_ms)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.error_rate.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Load test: no stored run in this build.</p>
        )}
        {load.method ? <p className="max-w-3xl text-sm leading-6 text-muted">{load.method}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Cost</h2>
        <p className="max-w-3xl leading-7 text-muted">
          {extended.generation.label} Measured {measuredOn}. Per-query rows are in results/extended/per_query_cost.csv. The whole run, three models plus the judge over 40 questions each, cost an estimated {usd(extended.generation.total_estimated_spend_usd)}, of which the judge was {usd(extended.generation.judge_cost_usd)}.
        </p>
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line bg-wash text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Avg input tokens</th>
                <th className="px-3 py-2 font-semibold">Avg output tokens</th>
                <th className="px-3 py-2 font-semibold">Tokens min / median / max</th>
                <th className="px-3 py-2 font-semibold">Cost min / median / max</th>
                <th className="px-3 py-2 font-semibold">Price in / out per 1M</th>
              </tr>
            </thead>
            <tbody>
              {extended.generation.models.map((row) => {
                const spread = extended.per_query_cost[row.model as keyof typeof extended.per_query_cost];
                return (
                  <tr key={row.model} className="border-b border-line last:border-0">
                    <th className="px-3 py-2 font-semibold">{row.model}</th>
                    <td className="px-3 py-2 tabular-nums">{row.avg_input_tokens.toFixed(0)}</td>
                    <td className="px-3 py-2 tabular-nums">{row.avg_output_tokens.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular-nums">{spread.min_tokens} / {spread.median_tokens} / {spread.max_tokens}</td>
                    <td className="px-3 py-2 tabular-nums">{usd(spread.min_cost_usd)} / {usd(spread.median_cost_usd)} / {usd(spread.max_cost_usd)}</td>
                    <td className="px-3 py-2 tabular-nums">${row.input_per_million_usd} / ${row.output_per_million_usd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Failure analysis</h2>
        <p className="max-w-3xl leading-7 text-muted">
          {failures.failures.length} of {failures.questions} questions have Recall@5 below 1 on flat_baseline. {failures.retrieval_misses} have recall 0. {failures.partial_page_coverage} are partial. Causes from retrieved pages: {Object.entries(failures.fine_causes).map(([name, count]) => `${name} ${count}`).join(", ")}.
        </p>
        <Link href="/failure-analysis" className="text-sm font-semibold underline">
          Open the question list
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Limitations</h2>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-7 text-muted">
          <li>This is not a production system. There is no authentication, no shared rate-limit state, and no managed infrastructure.</li>
          <li>Hybrid and generation results come from one run on one machine. Answer quality is graded by a model, not by people.</li>
          <li>Cost is estimated from token usage and list prices, not taken from an invoice.</li>
          <li>The public demo approximates retrieval on six lab notes. It is not the benchmark index.</li>
        </ul>
      </section>
    </div>
  );
}
