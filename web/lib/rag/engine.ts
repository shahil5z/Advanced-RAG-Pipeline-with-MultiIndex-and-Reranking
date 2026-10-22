import corpus from "../../data/corpus.json";

const STOPWORDS = new Set(
  `a about above across after afterwards again against all almost alone along already also although always am among amongst amount an and another any anyhow anyone anything anyway anywhere are around as at back be became because become becomes becoming been before beforehand behind being below beside besides between beyond both bottom but by can cannot could did do does doing done down during each either else elsewhere empty enough etc even ever every everyone everything everywhere except few for former formerly from front full further get give go had has have he hence her here hereafter hereby herein hereupon hers herself him himself his how however i if in indeed into is it its itself last latter latterly least less made many may me meanwhile might mine more moreover most mostly much must my myself name namely neither never nevertheless next no nobody none nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own part per perhaps please put rather same see seem seemed seeming seems several she should show side since so some somehow someone something sometime sometimes somewhere still such take than that the their them themselves then thence there thereafter thereby therefore therein thereupon these they this those though through throughout thru thus to together too toward towards under until up upon us very via was we were what whatever when whence whenever where whereafter whereas whereby wherein whereupon wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves`.split(
    " ",
  ),
);

const DIMENSION = 64;

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

function buildCorpus(): IndexedCorpus {
  const chunks: Chunk[] = corpus.pages.map((page, index) => {
    const tokens = tokenize(page.text);
    return {
      chunk_id: `${corpus.document}:p${page.page}:c0`,
      document_id: corpus.document,
      page: page.page,
      text: page.text,
      corpus_index: index,
      tokens,
      vector: embedTokens(tokens),
    };
  });
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
  return { chunks, idf, avgdl };
}

let indexed: IndexedCorpus | null = null;

export function getChunks(): Chunk[] {
  indexed ??= buildCorpus();
  return indexed.chunks;
}

function bm25Scores(tokens: string[]): number[] {
  const corpusIndex = indexed ?? buildCorpus();
  indexed = corpusIndex;
  const k1 = 1.5;
  const b = 0.75;
  return corpusIndex.chunks.map((chunk) => {
    const frequency = new Map<string, number>();
    for (const token of chunk.tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);
    const length = chunk.tokens.length;
    let score = 0;
    for (const token of tokens) {
      const termFrequency = frequency.get(token) ?? 0;
      if (termFrequency === 0) continue;
      const weight = corpusIndex.idf.get(token) ?? 0;
      const denominator = termFrequency + k1 * (1 - b + (b * length) / (corpusIndex.avgdl || 1));
      score += (weight * (termFrequency * (k1 + 1))) / denominator;
    }
    return score;
  });
}

export function search(input: {
  question: string;
  topK: number;
  reranking: boolean;
  queryVector?: number[];
  documentVectors?: number[][];
}): Hit[] {
  const chunks = getChunks();
  const tokens = tokenize(input.question);
  const queryVector = input.queryVector ? normalize(input.queryVector) : embedTokens(tokens);
  const lexical = bm25Scores(tokens);
  const scored = chunks.map((chunk, index) => ({
    index,
    distance: l2sq(queryVector, input.documentVectors?.[index] ?? chunk.vector),
    bm25: lexical[index] ?? 0,
  }));
  const byDistance = [...scored].sort((left, right) => left.distance - right.distance || left.index - right.index);
  const vectorRank = new Map(byDistance.map((row, position) => [row.index, position + 1]));
  const pool = byDistance.slice(0, Math.min(chunks.length, input.topK));
  const ordered = input.reranking
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
