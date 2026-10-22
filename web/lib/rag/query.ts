import { getChunks, search } from "./engine";
import { cachedDocumentVectors, embedTexts, generateAnswer, OPENAI_EMBEDDING_MODEL, OPENAI_GENERATION_MODEL } from "./openai";
import type { QueryResponse } from "./types";

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

export async function runQuery(input: { question: string; reranking: boolean; topK: number }): Promise<QueryResponse> {
  const chunks = getChunks();
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  let embeddingMode: QueryResponse["embedding_mode"] = "hashing";
  let notice: string | null = null;
  let queryVector: number[] | undefined;
  let documentVectors: number[][] | undefined;

  if (apiKey) {
    try {
      documentVectors = await cachedDocumentVectors(
        apiKey,
        chunks.map((chunk) => chunk.text),
      );
      const [embedded] = await embedTexts(apiKey, [input.question]);
      queryVector = embedded;
      embeddingMode = "openai";
    } catch (error) {
      console.error("OpenAI embeddings failed", error instanceof Error ? error.message : "unknown");
      notice = "OpenAI embeddings were unavailable, so this answer uses the local hashing index.";
      queryVector = undefined;
      documentVectors = undefined;
    }
  }

  const started = performance.now();
  const hits = search({
    question: input.question,
    topK: input.topK,
    reranking: input.reranking,
    queryVector,
    documentVectors,
  });
  const retrievalMs = performance.now() - started;

  const top = hits[0];
  const lexicalMiss = Boolean(embeddingMode === "hashing" && top && top.bm25 <= 0);
  let answer = "I could not find an answer in the lab notes.";
  if (top && lexicalMiss) {
    answer = "I could not find a passage that shares the question's terms. The closest vector match is listed with the sources.";
  } else if (top) {
    answer = quote(top.chunk.text);
  }
  let answerMode: QueryResponse["answer_mode"] = "extractive";
  let generationMs = 0;

  if (apiKey && embeddingMode === "openai" && hits.length > 0) {
    const generationStarted = performance.now();
    try {
      answer = await generateAnswer(
        apiKey,
        promptFor(
          input.question,
          hits.map((hit) => hit.chunk),
        ),
      );
      answerMode = "openai";
    } catch (error) {
      console.error("OpenAI generation failed", error instanceof Error ? error.message : "unknown");
      const generationNotice = "OpenAI generation was unavailable, so the answer is the top passage.";
      notice = notice ? `${notice} ${generationNotice}` : generationNotice;
    }
    generationMs = performance.now() - generationStarted;
  }

  const distanceOrder = [...hits]
    .sort((left, right) => left.distance - right.distance || left.chunk.corpus_index - right.chunk.corpus_index)
    .map((hit) => hit.chunk.chunk_id)
    .join("\n");
  const rankedOrder = hits.map((hit) => hit.chunk.chunk_id).join("\n");
  return {
    answer,
    answer_mode: answerMode,
    embedding_mode: embeddingMode,
    retrieval_latency_ms: retrievalMs,
    generation_latency_ms: generationMs,
    rerank_changed_order: Boolean(input.reranking && distanceOrder !== rankedOrder),
    notice,
    configuration: {
      index_type: "flat",
      top_k: input.topK,
      reranking: input.reranking,
      embedding: embeddingMode === "openai" ? OPENAI_EMBEDDING_MODEL : "hashed-token-l2",
      generation_model: answerMode === "openai" ? OPENAI_GENERATION_MODEL : null,
      corpus: "lab-notes.pdf",
    },
    chunks: hits.map((hit) => ({
      rank: hit.rank,
      vector_rank: hit.vectorRank,
      chunk_id: hit.chunk.chunk_id,
      document: hit.chunk.document_id,
      page: hit.chunk.page,
      score: input.reranking ? hit.bm25 : hit.distance,
      score_type: input.reranking ? "bm25" : "l2_distance",
      distance: hit.distance,
      text: hit.chunk.text,
    })),
  };
}
