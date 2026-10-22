export type ScoreType = "bm25" | "l2_distance";
export type PublicIndex = "flat" | "hnsw" | "ivf";

export type RetrievedChunk = {
  rank: number;
  vector_rank: number;
  chunk_id: string;
  document: string;
  page: number;
  score: number;
  score_type: ScoreType;
  distance: number;
  text: string;
};

export type QueryMetrics = {
  labeled: boolean;
  relevant_pages: number[];
  recall_at_k: number | null;
  reciprocal_rank: number | null;
};

export type QueryResponse = {
  answer: string;
  answer_mode: "extractive" | "openai";
  embedding_mode: "hashing" | "openai";
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  latency_ms: {
    embed: number;
    search: number;
    rerank: number;
    generate: number;
  };
  rerank_changed_order: boolean;
  notice: string | null;
  configuration: {
    index_type: PublicIndex;
    index_note: string;
    vectors_searched: number;
    vectors_total: number;
    top_k: number;
    reranking: boolean;
    embedding: string;
    generation_model: string | null;
    corpus: string;
  };
  metrics: QueryMetrics;
  comparison: {
    vector: RetrievedChunk[];
    reranked: RetrievedChunk[];
  };
  chunks: RetrievedChunk[];
};
