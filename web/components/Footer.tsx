import { GITHUB_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Shahil Haque. Advanced RAG pipeline with multi-index retrieval and reranking.</p>
        <a className="font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy" href={GITHUB_URL}>
          View source on GitHub
        </a>
      </div>
    </footer>
  );
}
