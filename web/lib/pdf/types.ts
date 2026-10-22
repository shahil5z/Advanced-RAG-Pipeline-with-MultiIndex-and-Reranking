export type PdfPage = { page: number; text: string };

export type PdfChunk = {
  id: string;
  page: number;
  text: string;
};

export type IndexedChunk = PdfChunk & { v: string };

export type Usage = {
  embedding_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
};

export type PdfPassage = {
  rank: number;
  id: string;
  page: number;
  text: string;
  cosine: number;
  bm25: number;
  rrf: number;
};

export type IndexResponse = {
  document: string;
  pages: number;
  chunks: IndexedChunk[];
  suggestions: string[];
  last_indexed_page: number;
  chunk_limit_reached: boolean;
  usage: Usage;
  latency_ms: { chunk: number; embed: number; suggest: number };
  remaining: number;
  limit: number;
};

export type AskResponse = {
  answer: string;
  found: boolean;
  citations: number[];
  passages: PdfPassage[];
  reranked: boolean;
  usage: Usage;
  latency_ms: { embed: number; retrieve: number; rerank: number; generate: number };
  remaining: number;
  limit: number;
};
