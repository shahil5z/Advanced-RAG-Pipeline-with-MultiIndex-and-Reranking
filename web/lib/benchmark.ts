import data from "@/data/benchmark.json";

export type Experiment = {
  name: string;
  recall_at_k: number;
  precision_at_k: number;
  mrr: number;
  ndcg: number;
  citation_precision: number;
  retrieval_mean_ms: number;
  retrieval_p50_ms: number;
  retrieval_p95_ms: number;
  questions: number;
  k: number;
  index_type: string;
  reranking: boolean;
  embedding_model: string;
  chunk_size: number;
  seed: number;
  python: string;
};

export const experiments = data.experiments as Experiment[];

const labels: Record<string, string> = {
  flat_baseline: "Flat + BM25",
  flat_no_rerank: "Flat",
  hnsw: "HNSW + BM25",
  ivf: "IVF + BM25",
};

export function experimentLabel(name: string): string {
  return labels[name] ?? name;
}

export function findExperiment(name: string): Experiment | undefined {
  return experiments.find((row) => row.name === name);
}
