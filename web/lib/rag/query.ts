import demo from "../../data/demo.json";

import { getChunks, searchDetailed } from "./engine";
import type { Hit } from "./engine";
import { emptyUsage, priceUsage } from "../openai/client";
import { embedTexts, generateAnswer, labNoteVectors, OPENAI_EMBEDDING_MODEL, OPENAI_GENERATION_MODEL } from "./openai";
import type { QueryMetrics, QueryResponse, RetrievedChunk } from "./types";

const labels = new Map<string, number[]>(
  demo.examples.map((example) => {
    const page = example.chunks.find((chunk) => chunk.rank === 1)?.page;
    return [example.question, typeof page === "number" ? [page] : []];
  }),
);

function promptFor(question: string, contexts: Array<{ chunk_id: string; document_id: string; page: number; text: string }>): string {
  const context = contexts.length
    ? contexts.map((chunk) => `[${chunk.chunk_id}] ${chunk.document_id} page ${chunk.page}\n${chunk.text}`).join("\n\n")
    : "No documents were retrieved.";
  return [
    "You are an expert assistant. Answer the question using only the context below.",
    "",
    `Question: ${question}`,
    "",
    "Context:",
    context,
    "",
    "Instructions:",
    "1. Provide a clear, concise answer.",
    '2. If the context does not contain the answer, say "I could not find an answer."',
    "3. When you use a source, mention its chunk id.",
    "",
    "Answer:",
  ].join("\n");
}

function quote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function toChunk(hit: Hit, reranking: boolean): RetrievedChunk {
  return {
    rank: hit.rank,
    vector_rank: hit.vectorRank,
    chunk_id: hit.chunk.chunk_id,
    document: hit.chunk.document_id,
    page: hit.chunk.page,
    score: reranking ? hit.bm25 : hit.distance,
    score_type: reranking ? "bm25" : "l2_distance",
    distance: hit.distance,
    text: hit.chunk.text,
  };
}

export function scoreAgainstLabels(pages: number[], relevant: number[]): Pick<QueryMetrics, "recall_at_k" | "reciprocal_rank"> {
  if (relevant.length === 0) return { recall_at_k: null, reciprocal_rank: null };
  const found = relevant.filter((page) => pages.includes(page));
  let reciprocal = 0;
  for (let index = 0; index < pages.length; index += 1) {
    if (relevant.includes(pages[index])) {
      reciprocal = 1 / (index + 1);
      break;
    }
  }
  return { recall_at_k: found.length / relevant.length, reciprocal_rank: reciprocal };
}

export async function runQuery(input: {
  question: string;
  reranking: boolean;
  topK: number;
  indexType?: QueryResponse["configuration"]["index_type"];
  passages?: string[];
  live?: boolean;
}): Promise<QueryResponse> {
  const custom = Boolean(input.passages && input.passages.length > 0);
  const live = Boolean(input.live);
  const usage = emptyUsage();
  let embeddingMode: QueryResponse["embedding_mode"] = "hashing";
  let embeddingCached = false;
  const notice: string | null = custom ? "Pasted passages are embedded for this request only and are not stored." : null;
  let queryVector: number[] | undefined;
  let documentVectors: number[][] | undefined;

  const embedStarted = performance.now();
  if (live) {
    if (custom) {
      const vectors = await embedTexts([...(input.passages ?? []), input.question], usage);
      queryVector = vectors.pop();
      documentVectors = vectors;
    } else {
      const lab = await labNoteVectors(getChunks().map((chunk) => chunk.text), usage);
      embeddingCached = lab.cached;
      documentVectors = lab.vectors;
      [queryVector] = await embedTexts([input.question], usage);
    }
    embeddingMode = "openai";
  }
  const embedMs = performance.now() - embedStarted;

  const result = searchDetailed({
    question: input.question,
    topK: input.topK,
    reranking: input.reranking,
    indexType: input.indexType ?? "flat",
    queryVector,
    documentVectors,
    passages: input.passages,
  });

  const top = result.hits[0];
  const lexicalMiss = Boolean(embeddingMode === "hashing" && top && top.bm25 <= 0);
  let answer = custom ? "I could not find an answer in the pasted passages." : "I could not find an answer in the lab notes.";
  if (top && lexicalMiss) {
    answer = "I could not find a passage that shares the question's terms. The closest vector match is listed with the sources.";
  } else if (top) {
    answer = quote(top.chunk.text);
  }
  let answerMode: QueryResponse["answer_mode"] = "extractive";
  let generationMs = 0;

  if (live && result.hits.length > 0) {
    const generationStarted = performance.now();
    answer = await generateAnswer(
      promptFor(
        input.question,
        result.hits.map((hit) => hit.chunk),
      ),
      usage,
    );
    answerMode = "openai";
    generationMs = performance.now() - generationStarted;
  }

  const relevant = custom ? [] : (labels.get(input.question) ?? []);
  const pages = result.hits.map((hit) => hit.chunk.page);
  const scored = scoreAgainstLabels(pages, relevant);
  const metrics: QueryMetrics = {
    labeled: relevant.length > 0,
    relevant_pages: relevant,
    recall_at_k: scored.recall_at_k,
    reciprocal_rank: scored.reciprocal_rank,
  };

  return {
    answer,
    answer_mode: answerMode,
    embedding_mode: embeddingMode,
    retrieval_latency_ms: embedMs + result.searchMs + result.rerankMs,
    generation_latency_ms: generationMs,
    latency_ms: {
      embed: embedMs,
      search: result.searchMs,
      rerank: result.rerankMs,
      generate: generationMs,
    },
    rerank_changed_order: result.vectorHits.map((hit) => hit.chunk.chunk_id).join("\n") !== result.rerankedHits.map((hit) => hit.chunk.chunk_id).join("\n"),
    notice,
    usage: priceUsage(usage),
    embedding_cached: embeddingCached,
    configuration: {
      index_type: result.indexType,
      index_note: result.note,
      vectors_searched: result.visited,
      vectors_total: result.total,
      top_k: input.topK,
      reranking: input.reranking,
      embedding: embeddingMode === "openai" ? OPENAI_EMBEDDING_MODEL : "hashed-token-l2",
      generation_model: answerMode === "openai" ? OPENAI_GENERATION_MODEL : null,
      corpus: custom ? "pasted.txt" : "lab-notes.pdf",
    },
    metrics,
    comparison: {
      vector: result.vectorHits.map((hit) => toChunk(hit, false)),
      reranked: result.rerankedHits.map((hit) => toChunk(hit, true)),
    },
    chunks: result.hits.map((hit) => toChunk(hit, input.reranking)),
  };
}
