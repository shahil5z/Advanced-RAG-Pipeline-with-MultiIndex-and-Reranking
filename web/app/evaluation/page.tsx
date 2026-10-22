import type { Metadata } from "next";
import Link from "next/link";

import { experimentLabel, experiments, findExperiment } from "@/lib/benchmark";
import { metric, millis } from "@/lib/format";
import failures from "@/data/failures.json";
import loadFile from "@/data/load-test.json";

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
  description: "Stored retrieval benchmark, reranking impact, and measurements that have not been run.",
};

const hybridRows = ["Dense only", "BM25 only", "Dense + BM25", "Dense + BM25 + rerank"];

export default function EvaluationPage() {
  const flat = findExperiment("flat_baseline");
  const plain = findExperiment("flat_no_rerank");
  const sample = experiments[0];

  return (
    <div className="shell space-y-12 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Evaluation</h1>
        <p className="text-base leading-7 text-muted">
          {sample ? `${sample.questions} reviewed questions, K = ${sample.k}, page-level labels.` : "No stored benchmark is available."} Retrieval metrics below are from the stored FAISS run. Generation cost is separate and has not been run.
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
          The configuration is dense_top_k, bm25_top_k, fusion rrf, then an optional rerank of the fused set. It has not been scored on the 40-question set. The table above is dense FAISS with or without BM25 rerank, not reciprocal rank fusion.
        </p>
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-wash text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Setup</th>
                <th className="px-3 py-2 font-semibold">Recall@5</th>
                <th className="px-3 py-2 font-semibold">MRR</th>
                <th className="px-3 py-2 font-semibold">nDCG</th>
              </tr>
            </thead>
            <tbody>
              {hybridRows.map((row) => (
                <tr key={row} className="border-b border-line last:border-0">
                  <th className="px-3 py-2 font-semibold">{row}</th>
                  <td className="px-3 py-2">not yet measured</td>
                  <td className="px-3 py-2">not yet measured</td>
                  <td className="px-3 py-2">not yet measured</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Model comparison</h2>
        <p className="max-w-3xl leading-7 text-muted">not yet run. Model names in config/models.yaml are checked against the account only when the cost script is invoked with a key. This page does not assume those models exist.</p>
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
          <p className="text-sm text-muted">Load test: not yet measured.</p>
        )}
        {load.method ? <p className="max-w-3xl text-sm leading-6 text-muted">{load.method}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Cost</h2>
        <p className="max-w-3xl leading-7 text-muted">not yet run. Estimated OpenAI API cost based on configured model pricing. No generation bill is stored in this repository.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Failure analysis</h2>
        <p className="max-w-3xl leading-7 text-muted">
          {failures.failures.length} of {failures.questions} questions have Recall@5 below 1 on flat_baseline. {failures.retrieval_misses} have recall 0. {failures.partial_page_coverage} are partial. Retrieved pages were not stored, so finer causes were not assigned.
        </p>
        <Link href="/failure-analysis" className="text-sm font-semibold underline">
          Open the question list
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Limitations</h2>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 leading-7 text-muted">
          <li>This is not a production system. There is no authentication, no shared rate-limit state, and no managed infrastructure.</li>
          <li>Hybrid retrieval on the 40 questions is not yet measured.</li>
          <li>Generation quality, model comparison, and API cost are not yet run.</li>
          <li>The public demo approximates retrieval on six lab notes. It is not the benchmark index.</li>
        </ul>
      </section>
    </div>
  );
}
