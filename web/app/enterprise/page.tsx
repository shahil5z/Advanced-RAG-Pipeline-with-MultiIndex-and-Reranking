import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enterprise",
  description: "A synthetic technical-document assistant and the controls it would need.",
};

const domains = [
  "Manufacturing manuals",
  "Engineering notes",
  "Public-sector documents",
  "Healthcare literature",
  "Compliance documents",
];

export default function EnterprisePage() {
  return (
    <div className="shell space-y-10 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Enterprise boundary</h1>
        <p className="leading-7 text-muted">
          This is a synthetic shape for an Austrian technical-document assistant. The documents in the repository are public reports and lab notes. Nothing here is a customer corpus, and no real Austrian company is implied.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl">Path</h2>
        <ol className="max-w-3xl list-decimal space-y-2 pl-5 leading-7">
          <li>Ingest pages with an access label on each document. The label is metadata, not a slogan.</li>
          <li>Retrieve with dense search and BM25, then fuse. Apply document and page filters before the answer is built.</li>
          <li>Rerank the fused set. Require a citation that points at a retrieved passage.</li>
          <li>Store an audit row: request id, document ids, latency, model name, token counts, and status. Do not store the raw prompt by default.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Domains</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {domains.map((domain) => (
            <li key={domain} className="border border-line bg-card px-4 py-3 text-sm">
              {domain}
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl space-y-4">
        <h2 className="text-2xl">Controls</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold">Access control</dt>
            <dd className="mt-1 leading-7 text-muted">A filter can drop chunks from a document the caller is not allowed to see. This demo does not authenticate the caller. A real deployment needs an identity system in front of the filter.</dd>
          </div>
          <div>
            <dt className="font-semibold">Auditability</dt>
            <dd className="mt-1 leading-7 text-muted">The local event row is the audit sketch: who asked is absent until an identity layer exists. The evaluation run now stores retrieved pages for every question, which is the shape an audit row would carry.</dd>
          </div>
          <div>
            <dt className="font-semibold">Observability</dt>
            <dd className="mt-1 leading-7 text-muted">Spans name guardrails, embedding, dense search, BM25, fusion, rerank, and generation. They stay on the machine unless a collector is configured.</dd>
          </div>
          <div>
            <dt className="font-semibold">Privacy</dt>
            <dd className="mt-1 leading-7 text-muted">The key stays on the server. Prompts and answers are omitted unless content logging is turned on. Retention is a setting, not a promise about a hosted vendor.</dd>
          </div>
          <div>
            <dt className="font-semibold">Human oversight</dt>
            <dd className="mt-1 leading-7 text-muted">Citations are there so a person can open the page. The fallback string is used when the answer is empty or uncited. A person still decides whether the answer is fit to send.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
