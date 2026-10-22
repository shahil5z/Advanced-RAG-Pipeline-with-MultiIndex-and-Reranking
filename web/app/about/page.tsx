import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Purpose, method, limitations, and the public demo boundary.",
};

export default function AboutPage() {
  return (
    <div className="shell space-y-10 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">About</h1>
        <p className="leading-7 text-muted">
          The project compares retrieval configurations on a fixed, reviewed question set and keeps a regression gate so a later change can fail in public. Generation is optional and measured separately when someone chooses to run it.
        </p>
      </header>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Benchmark method</h2>
        <p className="leading-7 text-muted">
          Pages are split, embedded with all-MiniLM-L6-v2, and indexed with FAISS Flat, HNSW, and IVF. A hit counts when its document and page are in the golden set. Recall@5, MRR, nDCG, and citation precision are the stored metrics. BM25 reranks dense hits in that run. It does not raise Recall@5.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Stack</h2>
        <p className="leading-7 text-muted">
          Python for the library and FastAPI. Next.js for the public site. FAISS for the benchmark. Qdrant for a local persistent store. OpenTelemetry, Jaeger, and Prometheus for local traces. GitHub Actions for the gates. Vercel hosts only the site.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Public demo boundary</h2>
        <p className="leading-7 text-muted">
          The demo runs live. Its primary section answers questions about an uploaded PDF through server routes under /api/pdf; the lab-note section calls POST /api/query. Both use OpenAI embeddings and gpt-4o-mini, share a limit of 15 tests per browser per day, and cap tokens per request. They do not call the FastAPI service, Qdrant, or the benchmark index.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Local deployment</h2>
        <p className="leading-7 text-muted">
          Compose and the k8s/ manifests are local. Readiness is GET /ready. Liveness is GET /health. The API reads the generation key from the environment only when generation is enabled. docs/LOCAL.md has the commands.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Limitations</h2>
        <p className="leading-7 text-muted">
          Hybrid retrieval, model comparison, and cost come from one measured run graded by a model. IVF is undertrained for this corpus size. The rate limiter is in-process. There is no authentication. Do not describe the system as production-ready.
        </p>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">EU and GDPR notes</h2>
        <p className="leading-7 text-muted">
          Data minimization, server-side secrets, no raw prompt logging by default, traceability, human oversight, transparency, configurable retention, and care with personal data are engineering choices in this demo. They are not legal advice and they are not a compliance certification. The longer note is docs/eu-ai-act-gdpr.md.
        </p>
        <p>
          <Link href="/de" className="text-sm font-semibold underline">
            Kurzfassung auf Deutsch
          </Link>
        </p>
      </section>
    </div>
  );
}
