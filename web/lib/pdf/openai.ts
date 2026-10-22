import { EMBEDDING_DIMENSIONS } from "./limits";
import { CHAT_MODEL, chatJson, embedBatch, emptyUsage, EMBEDDING_MODEL, priceUsage } from "../openai/client";
import type { Usage } from "../openai/client";

export const PDF_EMBEDDING_MODEL = EMBEDDING_MODEL;
export const PDF_CHAT_MODEL = CHAT_MODEL;
export { chatJson, emptyUsage, priceUsage };

export function embed(texts: string[], usage: Usage): Promise<number[][]> {
  return embedBatch(texts, usage, EMBEDDING_DIMENSIONS);
}
