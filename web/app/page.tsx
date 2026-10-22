import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">RAG Evaluation Lab</h1>
      <p className="max-w-2xl text-lg">
        A multi-index RAG pipeline with a local evaluation tool. It measures retrieval quality across configurations instead of relying on one example answer.
      </p>
      <div className="flex gap-3">
        <Link href="/demo" className="bg-stone-900 px-4 py-2 text-sm text-white">
          Open Demo
        </Link>
        <Link href="/evaluation" className="border border-stone-400 px-4 py-2 text-sm">
          Evaluation
        </Link>
        <a
          href="https://github.com/shahil5z/Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking"
          className="border border-stone-400 px-4 py-2 text-sm"
        >
          View source on GitHub
        </a>
      </div>
      <section className="space-y-2 text-sm leading-6">
        <h2 className="text-base font-semibold">What is measured</h2>
        <p>Recall@5, MRR, nDCG, citation precision, and retrieval time. The public pages show a prepared demo and the saved local benchmark. They do not call OpenAI.</p>
      </section>
    </div>
  );
}
