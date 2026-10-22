export type ScoreType = "bm25" | "l2_distance";

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

export type QueryResponse = {
  answer: string;
  answer_mode: "extractive" | "openai";
  embedding_mode: "hashing" | "openai";
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  rerank_changed_order: boolean;
  notice: string | null;
  configuration: {
    index_type: "flat";
    top_k: number;
    reranking: boolean;
    embedding: string;
    generation_model: string | null;
    corpus: string;
  };
  chunks: RetrievedChunk[];
};
