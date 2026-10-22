import assert from "node:assert/strict";

import { getChunks, search, searchDetailed } from "./engine";
import { runQuery, scoreAgainstLabels } from "./query";
import { parseQuery } from "./request";

const cases: Array<[string, string]> = [
  ["What does the Flat index compare a query vector with?", "every stored vector"],
  ["How many neighbors does each HNSW node keep in this lab?", "32 neighbors"],
  ["How many IVF lists are searched for a query in this lab?", "10 of those lists"],
  ["How does BM25 order the retrieved chunks?", "higher BM25"],
  ["When does recall count a chunk as relevant?", "golden file"],
  ["What overlap does the lab chunker use?", "overlap of 200"],
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

const flat = searchDetailed({ question: cases[0][0], topK: 3, reranking: false, indexType: "flat" });
assert.equal(flat.visited, flat.total);
assert.equal(flat.total, 6);
assert.equal(flat.vectorHits.length, 3);
assert.equal(flat.rerankedHits.length, 3);

const ivf = searchDetailed({ question: cases[0][0], topK: 3, reranking: false, indexType: "ivf" });
assert.ok(ivf.visited < ivf.total, `ivf visited ${ivf.visited}`);
assert.ok(ivf.note.includes("not the local FAISS IVF"));

const hnsw = searchDetailed({ question: cases[1][0], topK: 3, reranking: false, indexType: "hnsw" });
assert.ok(hnsw.visited < hnsw.total, `hnsw visited ${hnsw.visited}`);
assert.ok(hnsw.note.includes("not the local FAISS HNSW"));

const custom = searchDetailed({
  question: "Where is the blue notebook?",
  topK: 2,
  reranking: true,
  passages: ["The blue notebook is on the second shelf.", "The red notebook is in the drawer."],
});
assert.equal(custom.total, 2);
assert.ok(custom.hits[0].chunk.text.includes("blue notebook"));
assert.equal(custom.hits[0].chunk.document_id, "pasted.txt");

const labeled = scoreAgainstLabels([2, 0, 1], [0]);
assert.equal(labeled.recall_at_k, 1);
assert.equal(labeled.reciprocal_rank, 0.5);
assert.deepEqual(scoreAgainstLabels([1], []), { recall_at_k: null, reciprocal_rank: null });

const parsed = parseQuery({ question: "  How many neighbors?  ", top_k: 4, reranking: false, index_type: "hnsw" });
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.value.question, "How many neighbors?");
  assert.equal(parsed.value.topK, 4);
  assert.equal(parsed.value.indexType, "hnsw");
  assert.equal(parsed.value.reranking, false);
}
assert.equal(parseQuery({ question: "x", index_type: "faiss" }).ok, false);
assert.equal(parseQuery({ question: "x", top_k: 9 }).ok, false);
assert.equal(parseQuery({ question: "x", passages: [] }).ok, false);
assert.equal(parseQuery({ question: "x", passages: ["one", "two"] }).ok, true);

async function queryShape() {
  if (process.env.OPENAI_API_KEY) return;
  const response = await runQuery({ question: cases[0][0], reranking: true, topK: 3, indexType: "flat" });
  assert.equal(response.metrics.labeled, true);
  assert.equal(response.metrics.recall_at_k, 1);
  assert.equal(response.metrics.reciprocal_rank, 1);
  assert.equal(response.comparison.vector.length, 3);
  assert.equal(response.comparison.reranked.length, 3);
  assert.equal(response.configuration.vectors_total, 6);
  assert.equal(response.latency_ms.generate, 0);
  const pasted = await runQuery({
    question: "Where is the blue notebook?",
    reranking: false,
    topK: 1,
    passages: ["The blue notebook is on the second shelf.", "Rain fell on the empty street."],
  });
  assert.equal(pasted.metrics.labeled, false);
  assert.equal(pasted.configuration.corpus, "pasted.txt");
  assert.ok(pasted.answer.includes("blue notebook"));
}

queryShape().then(() => {
  console.log("engine tests passed");
});
