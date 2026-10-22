export const GITHUB_URL = "https://github.com/shahil5z/Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking";

const DEFAULT_SITE_URL = "https://advanced-rag-evaluation.vercel.app";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return DEFAULT_SITE_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();
