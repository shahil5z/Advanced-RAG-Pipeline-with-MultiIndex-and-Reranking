import corpus from "../../data/corpus.json";

const STOPWORDS = new Set(
  `a about above across after afterwards again against all almost alone along already also although always am among amongst amount an and another any anyhow anyone anything anyway anywhere are around as at back be became because become becomes becoming been before beforehand behind being below beside besides between beyond both bottom but by can cannot could did do does doing done down during each either else elsewhere empty enough etc even ever every everyone everything everywhere except few for former formerly from front full further get give go had has have he hence her here hereafter hereby herein hereupon hers herself him himself his how however i if in indeed into is it its itself last latter latterly least less made many may me meanwhile might mine more moreover most mostly much must my myself name namely neither never nevertheless next no nobody none nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own part per perhaps please put rather same see seem seemed seeming seems several she should show side since so some somehow someone something sometime sometimes somewhere still such take than that the their them themselves then thence there thereafter thereby therefore therein thereupon these they this those though through throughout thru thus to together too toward towards under until up upon us very via was we were what whatever when whence whenever where whereafter whereas whereby wherein whereupon wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves`.split(
    " ",
  ),
);

const DIMENSION = 64;

export type PublicIndex = "flat" | "hnsw" | "ivf";

export type Chunk = {
  chunk_id: string;
  document_id: string;
  page: number;
  text: string;
  corpus_index: number;
  tokens: string[];
  vector: number[];
};

export type Hit = {
  chunk: Chunk;
  rank: number;
  vectorRank: number;
  distance: number;
  bm25: number;
};

export type SearchResult = {
  hits: Hit[];
  vectorHits: Hit[];
  rerankedHits: Hit[];
  visited: number;
  total: number;
  indexType: PublicIndex;
  note: string;
  searchMs: number;
  rerankMs: number;
};

type IndexedCorpus = {
  chunks: Chunk[];
  idf: Map<string, number>;
  avgdl: number;
};

const TOKEN = /[a-z0-9]+/g;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN) ?? []).filter((token) => !STOPWORDS.has(token));
}

function fnv(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function embedTokens(tokens: string[]): number[] {
  const vector = new Array<number>(DIMENSION).fill(0);
  const add = (token: string) => {
    const hash = fnv(token);
    const slot = hash % DIMENSION;
    vector[slot] += (hash & 1) === 0 ? 1 : -1;
  };
  tokens.forEach(add);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    add(`${tokens[index]}_${tokens[index + 1]}`);
  }
  return normalize(vector);
}

export function normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  return vector.map((value) => value / norm);
}

function l2sq(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return sum;
}

function indexStats(chunks: Chunk[]): Pick<IndexedCorpus, "idf" | "avgdl"> {
  const documentFrequency = new Map<string, number>();
  for (const chunk of chunks) {
    for (const token of new Set(chunk.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const total = chunks.length;
  for (const [token, frequency] of documentFrequency) {
    idf.set(token, Math.log((total - frequency + 0.5) / (frequency + 0.5) + 1));
  }
  const avgdl = chunks.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / (total || 1);
  return { idf, avgdl };
}

function chunksFrom(pages: Array<{ page: number; text: string }>, documentId: string): Chunk[] {
  return pages.map((page, index) => {
    const tokens = tokenize(page.text);
    return {
      chunk_id: `${documentId}:p${page.page}:c0`,
      document_id: documentId,
      page: page.page,
      text: page.text,
      corpus_index: index,
      tokens,
      vector: embedTokens(tokens),
    };
  });
}

function buildCorpus(): IndexedCorpus {
  const chunks = chunksFrom(corpus.pages, corpus.document);
  return { chunks, ...indexStats(chunks) };
}

let indexed: IndexedCorpus | null = null;

export function getChunks(): Chunk[] {
  indexed ??= buildCorpus();
  return indexed.chunks;
}

export function passagesToChunks(passages: string[]): Chunk[] {
  return chunksFrom(
    passages.map((text, page) => ({ page, text })),
    "pasted.txt",
  );
}

function bm25Scores(chunks: Chunk[], tokens: string[], idf: Map<string, number>, avgdl: number): number[] {
  const k1 = 1.5;
  const b = 0.75;
  return chunks.map((chunk) => {
    const frequency = new Map<string, number>();
    for (const token of chunk.tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);
    const length = chunk.tokens.length;
    let score = 0;
    for (const token of tokens) {
      const termFrequency = frequency.get(token) ?? 0;
      if (termFrequency === 0) continue;
      const weight = idf.get(token) ?? 0;
      const denominator = termFrequency + k1 * (1 - b + (b * length) / (avgdl || 1));
      score += (weight * (termFrequency * (k1 + 1))) / denominator;
    }
    return score;
  });
}

function ivfCandidates(vectors: number[][], query: number[]): { indexes: number[]; lists: number } {
  const total = vectors.length;
  const seeds = total >= 4 ? [0, Math.floor((total - 1) / 2), total - 1] : [0];
  const lists = seeds.map(() => [] as number[]);
  for (let index = 0; index < total; index += 1) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let seed = 0; seed < seeds.length; seed += 1) {
      const distance = l2sq(vectors[index], vectors[seeds[seed]]);
      if (distance < bestDistance || (distance === bestDistance && seed < best)) {
        best = seed;
        bestDistance = distance;
      }
    }
    lists[best].push(index);
  }
  let probe = 0;
  let probeDistance = Number.POSITIVE_INFINITY;
  for (let seed = 0; seed < seeds.length; seed += 1) {
    const distance = l2sq(query, vectors[seeds[seed]]);
    if (distance < probeDistance || (distance === probeDistance && seed < probe)) {
      probe = seed;
      probeDistance = distance;
    }
  }
  const indexes = lists[probe].length > 0 ? lists[probe] : [seeds[probe]];
  return { indexes, lists: seeds.length };
}

function hnswCandidates(vectors: number[][], query: number[]): number[] {
  const total = vectors.length;
  const neighbors: number[][] = Array.from({ length: total }, () => []);
  for (let index = 0; index < total; index += 1) {
    const nearest = vectors
      .map((vector, other) => ({ other, distance: other === index ? Number.POSITIVE_INFINITY : l2sq(vectors[index], vector) }))
      .sort((left, right) => left.distance - right.distance || left.other - right.other)
      .slice(0, 2)
      .map((row) => row.other);
    for (const other of nearest) {
      if (!neighbors[index].includes(other)) neighbors[index].push(other);
      if (!neighbors[other].includes(index)) neighbors[other].push(index);
    }
  }

  const path = [0];
  let current = 0;
  for (let step = 0; step < 2; step += 1) {
    let best = current;
    let bestDistance = l2sq(query, vectors[current]);
    for (const next of neighbors[current]) {
      const distance = l2sq(query, vectors[next]);
      if (distance < bestDistance || (distance === bestDistance && next < best)) {
        best = next;
        bestDistance = distance;
      }
    }
    if (best === current) break;
    current = best;
    path.push(current);
  }
  return path;
}

function candidatesFor(indexType: PublicIndex, vectors: number[][], query: number[]): { indexes: number[]; note: string } {
  const total = vectors.length;
  if (indexType === "flat" || total <= 2) {
    return {
      indexes: vectors.map((_, index) => index),
      note: `Flat search compared the query with all ${total} vectors.`,
    };
  }
  if (indexType === "ivf") {
    const probed = ivfCandidates(vectors, query);
    return {
      indexes: probed.indexes,
      note: `IVF-style search probed 1 of ${probed.lists} lists and scored ${probed.indexes.length} of ${total} vectors. This is not the local FAISS IVF index.`,
    };
  }
  const indexes = hnswCandidates(vectors, query);
  return {
    indexes,
    note: `HNSW-style search walked ${indexes.length} of ${total} graph nodes. This is not the local FAISS HNSW index.`,
  };
}

function toHits(chunks: Chunk[], rows: Array<{ index: number; distance: number; bm25: number }>, topK: number, reranking: boolean): Hit[] {
  const byDistance = [...rows].sort((left, right) => left.distance - right.distance || left.index - right.index);
  const vectorRank = new Map(byDistance.map((row, position) => [row.index, position + 1]));
  const pool = byDistance.slice(0, Math.min(rows.length, topK));
  const ordered = reranking
    ? [...pool].sort((left, right) => right.bm25 - left.bm25 || left.distance - right.distance || left.index - right.index)
    : pool;
  return ordered.map((row, position) => ({
    chunk: chunks[row.index],
    rank: position + 1,
    vectorRank: vectorRank.get(row.index) ?? position + 1,
    distance: row.distance,
    bm25: row.bm25,
  }));
}

export function searchDetailed(input: {
  question: string;
  topK: number;
  reranking: boolean;
  indexType?: PublicIndex;
  queryVector?: number[];
  documentVectors?: number[][];
  passages?: string[];
}): SearchResult {
  const custom = input.passages && input.passages.length > 0;
  const chunks = custom ? passagesToChunks(input.passages ?? []) : getChunks();
  const stats = custom ? indexStats(chunks) : (indexed ?? buildCorpus());
  if (!custom) indexed = stats as IndexedCorpus;
  const tokens = tokenize(input.question);
  const queryVector = input.queryVector ? normalize(input.queryVector) : embedTokens(tokens);
  const vectors = chunks.map((chunk, index) => input.documentVectors?.[index] ?? chunk.vector);
  const lexical = bm25Scores(chunks, tokens, stats.idf, stats.avgdl);
  const indexType = input.indexType ?? "flat";
  const selected = candidatesFor(custom && indexType !== "flat" && chunks.length <= 2 ? "flat" : indexType, vectors, queryVector);
  const searchStarted = performance.now();
  const rows = selected.indexes.map((index) => ({
    index,
    distance: l2sq(queryVector, vectors[index]),
    bm25: lexical[index] ?? 0,
  }));
  const searchMs = performance.now() - searchStarted;
  const rerankStarted = performance.now();
  const vectorHits = toHits(chunks, rows, input.topK, false);
  const rerankedHits = toHits(chunks, rows, input.topK, true);
  const rerankMs = performance.now() - rerankStarted;
  return {
    hits: input.reranking ? rerankedHits : vectorHits,
    vectorHits,
    rerankedHits,
    visited: selected.indexes.length,
    total: chunks.length,
    indexType: chunks.length <= 2 && indexType !== "flat" ? "flat" : indexType,
    note: selected.note,
    searchMs,
    rerankMs,
  };
}

export function search(input: {
  question: string;
  topK: number;
  reranking: boolean;
  queryVector?: number[];
  documentVectors?: number[][];
}): Hit[] {
  return searchDetailed(input).hits;
}
