export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const PART_BYTES = 3 * 1024 * 1024;
export const MAX_PART_BYTES = 4 * 1024 * 1024;
export const DAILY_LIMIT = 15;
export const MAX_PAGES = 400;
export const MAX_CHUNKS = 300;
export const MAX_CHUNK_CHARS = 1500;
export const MAX_QUESTION_CHARS = 500;
export const CHUNK_SIZE = 900;
export const CHUNK_OVERLAP = 150;
export const EMBEDDING_DIMENSIONS = 512;
export const TOP_K = 5;
export const CANDIDATES = 20;
export const RERANK_POOL = 10;
export const NOT_FOUND = "Not found in document.";

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validatePdfFile(file: { name: string; size: number; type: string }): string | null {
  const looksPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) return "Only PDF files are accepted.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_PDF_BYTES) {
    return `This file is ${formatBytes(file.size)}. The maximum is 10 MB.`;
  }
  return null;
}
