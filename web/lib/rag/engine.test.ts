import assert from "node:assert/strict";

import { getChunks, search } from "./engine";

const cases: Array<[string, string]> = [
  ["What does the Flat index compare a query vector with?", "every stored vector"],
  ["How many neighbors does each HNSW node keep in this lab?", "32 neighbors"],
  ["How many IVF lists are searched for a query in this lab?", "10 of those lists"],
  ["How does BM25 order the retrieved chunks?", "higher BM25"],
  ["When does recall count a chunk as relevant?", "golden file"],
  ["Does the public demo call OpenAI?", "does not call OpenAI"],
];

const chunks = getChunks();
assert.equal(chunks.length, 6);
assert.deepEqual(
  chunks.map((chunk) => chunk.chunk_id),
  chunks.map((_, index) => `lab-notes.pdf:p${index}:c0`),
);

for (const [question, snippet] of cases) {
  const hits = search({ question, topK: 3, reranking: true });
  assert.ok(hits[0], question);
  assert.equal(hits[0].rank, 1);
  assert.ok(hits[0].bm25 > 0, question);
  assert.ok(hits[0].chunk.text.includes(snippet), `${question} -> ${hits[0].chunk.text}`);
  assert.equal(hits.length, 3);
}

const unordered = search({ question: cases[1][0], topK: 3, reranking: false });
assert.ok(unordered[0].chunk.text.includes("32 neighbors"));
assert.equal(unordered[0].vectorRank, 1);
for (let index = 1; index < unordered.length; index += 1) {
  assert.ok(unordered[index].distance >= unordered[index - 1].distance);
}

const miss = search({ question: "What is the capital of France?", topK: 3, reranking: true });
assert.equal(miss[0].bm25, 0);

const reordered = cases.filter(([question]) => {
  const withRerank = search({ question, topK: 4, reranking: true }).map((hit) => hit.chunk.chunk_id).join();
  const vectorOrder = search({ question, topK: 4, reranking: false }).map((hit) => hit.chunk.chunk_id).join();
  return withRerank !== vectorOrder;
});
assert.ok(reordered.length >= 1, "BM25 should change passage order for at least one lab question");

console.log("engine tests passed");
