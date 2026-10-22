import { tokenize } from "../rag/engine";

export function bm25Scores(query: string, texts: string[], k1 = 1.5, b = 0.75): number[] {
  const docs = texts.map((text) => tokenize(text));
  const n = docs.length;
  if (n === 0) return [];
  const avgdl = docs.reduce((sum, doc) => sum + doc.length, 0) / n || 1;
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const terms = tokenize(query);
  return docs.map((doc) => {
    const tf = new Map<string, number>();
    for (const term of doc) tf.set(term, (tf.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of terms) {
      const freq = tf.get(term);
      if (!freq) continue;
      const docFreq = df.get(term) ?? 0;
      const idf = Math.log(1 + (n - docFreq + 0.5) / (docFreq + 0.5));
      score += (idf * freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * doc.length) / avgdl));
    }
    return score;
  });
}

export function rankOrder(scores: number[]): number[] {
  return scores
    .map((score, index) => ({ score, index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.index);
}

export function reciprocalRankFusion(rankings: number[][], k = 60): Map<number, number> {
  const fused = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((item, position) => {
      fused.set(item, (fused.get(item) ?? 0) + 1 / (k + position + 1));
    });
  }
  return fused;
}

export function encodeVector(vector: number[]): string {
  const bytes = new Int8Array(vector.length);
  vector.forEach((value, index) => {
    bytes[index] = Math.max(-127, Math.min(127, Math.round(value * 127)));
  });
  return Buffer.from(bytes.buffer).toString("base64");
}

export function decodeVector(encoded: string): number[] {
  const buffer = Buffer.from(encoded, "base64");
  const bytes = new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return Array.from(bytes, (value) => value / 127);
}

export function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let a = 0;
  let b = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    a += left[index] * left[index];
    b += right[index] * right[index];
  }
  if (a === 0 || b === 0) return 0;
  return dot / Math.sqrt(a * b);
}
