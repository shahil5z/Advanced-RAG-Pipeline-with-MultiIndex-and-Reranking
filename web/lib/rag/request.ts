import type { PublicIndex } from "./types";

export type ParsedQuery = {
  question: string;
  reranking: boolean;
  topK: number;
  indexType: PublicIndex;
  passages?: string[];
};

const INDEXES = new Set<PublicIndex>(["flat", "hnsw", "ivf"]);

export function parseQuery(record: Record<string, unknown>): { ok: true; value: ParsedQuery } | { ok: false; status: number; error: string } {
  if (typeof record.question !== "string") {
    return { ok: false, status: 400, error: "Question must be a string." };
  }
  const question = record.question.trim();
  if (!question) return { ok: false, status: 400, error: "Enter a question first." };
  if (question.length > 500) return { ok: false, status: 400, error: "Keep the question under 500 characters." };

  const reranking = record.reranking === undefined ? true : record.reranking;
  if (typeof reranking !== "boolean") return { ok: false, status: 400, error: "Reranking must be true or false." };

  let topK = 3;
  if (record.top_k !== undefined) {
    if (typeof record.top_k !== "number" || !Number.isInteger(record.top_k) || record.top_k < 1 || record.top_k > 8) {
      return { ok: false, status: 400, error: "top_k must be an integer from 1 to 8." };
    }
    topK = record.top_k;
  }

  let indexType: PublicIndex = "flat";
  if (record.index_type !== undefined) {
    if (typeof record.index_type !== "string" || !INDEXES.has(record.index_type as PublicIndex)) {
      return { ok: false, status: 400, error: "index_type must be flat, hnsw, or ivf." };
    }
    indexType = record.index_type as PublicIndex;
  }

  let passages: string[] | undefined;
  if (record.passages !== undefined) {
    if (!Array.isArray(record.passages)) return { ok: false, status: 400, error: "Passages must be a list of strings." };
    if (record.passages.length < 1 || record.passages.length > 8) {
      return { ok: false, status: 400, error: "Send between 1 and 8 passages." };
    }
    passages = [];
    for (const item of record.passages) {
      if (typeof item !== "string") return { ok: false, status: 400, error: "Each passage must be a string." };
      const text = item.trim();
      if (!text) return { ok: false, status: 400, error: "Each passage must contain text." };
      if (text.length > 800) return { ok: false, status: 400, error: "Keep each passage under 800 characters." };
      passages.push(text);
    }
  }

  return { ok: true, value: { question, reranking, topK, indexType, passages } };
}
