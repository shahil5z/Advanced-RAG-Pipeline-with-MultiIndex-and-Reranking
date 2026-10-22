export default function AboutPage() {
  return (
    <div className="space-y-4 text-sm leading-6">
      <h1 className="text-2xl font-semibold">About</h1>
      <p>
        The project extracts a multi-index RAG pipeline from an older notebook and evaluates retrieval instead of judging it from one example query.
      </p>
      <p>
        PDFs are split into pages, chunked, and embedded with all-MiniLM-L6-v2. Flat, HNSW, and IVF indexes are built with FAISS. BM25 can rerank the retrieved chunks. OpenAI is the only generation provider, and it receives the retrieved text. The public site does not call OpenAI.
      </p>
      <p>
        Retrieval metrics are page-level Recall, Precision, MRR, nDCG, and citation precision. A drop larger than 0.05 against the stored flat baseline fails `ragcheck ci`. Judge scores, when a key is present, are cached and are not treated as ground truth.
      </p>
      <p>
        The local benchmark uses the two project PDFs. Their redistribution rights are not established, so the public demo uses a separate short text written for this site. The science PDF was not used to write questions because its extracted text is unreliable OCR.
      </p>
      <p>
        <a className="underline" href="https://github.com/shahil5z/Advanced-RAG-Pipeline-with-MultiIndex-and-Reranking">
          View source on GitHub
        </a>
      </p>
    </div>
  );
}
