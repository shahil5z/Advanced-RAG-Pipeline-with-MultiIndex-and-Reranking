import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "API",
  description: "Request and response shape for POST /api/query.",
};

const curl = `curl -s ${SITE_URL}/api/query \\
  -H 'content-type: application/json' \\
  -d '{"question":"How many neighbors does each HNSW node keep in this lab?","top_k":3,"reranking":true,"index_type":"flat"}'`;

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">HTTP</p>
        <h1 className="text-4xl sm:text-5xl">Query API</h1>
        <p className="text-base leading-7 text-muted">
          <code className="rounded bg-wash px-1.5 py-0.5">POST /api/query</code> answers live over the lab notes, or passages you send with the request, using OpenAI embeddings and gpt-4o-mini. The /api/pdf routes extract, index and answer questions about an uploaded PDF. Both share a limit of 15 tests per browser per day. It is not the local FastAPI service. Nothing you paste is stored.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl">Request</h2>
        <pre className="panel overflow-x-auto p-4 text-sm leading-6">
          <code>{curl}</code>
        </pre>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="px-4 py-3 text-left text-muted">JSON fields. Only question is required.</caption>
            <thead>
              <tr className="border-b border-line bg-wash text-left">
                <th scope="col" className="px-4 py-2 font-semibold">
                  Field
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  question
                </th>
                <td className="px-3 py-3">string</td>
                <td className="px-4 py-3">Required. At most 500 characters.</td>
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  top_k
                </th>
                <td className="px-3 py-3">integer</td>
                <td className="px-4 py-3">1 to 8. Default 3.</td>
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  reranking
                </th>
                <td className="px-3 py-3">boolean</td>
                <td className="px-4 py-3">Default true. BM25 reorders the hits the index returned.</td>
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  index_type
                </th>
                <td className="px-3 py-3">string</td>
                <td className="px-4 py-3">flat, hnsw, or ivf. Default flat. hnsw and ivf are small in-process indexes, not FAISS.</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  passages
                </th>
                <td className="px-3 py-3">string[]</td>
                <td className="px-4 py-3">Optional. 1 to 8 strings, each under 800 characters. Replaces the lab notes for this call.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 text-sm leading-6">
        <h2 className="text-2xl">Response</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <code>answer</code> is the top passage, unless the server has an API key and then writes from the hits.
          </li>
          <li>
            <code>configuration.index_note</code> says how many vectors were scored. <code>vectors_searched</code> is lower than <code>vectors_total</code> for the HNSW-style and IVF-style indexes.
          </li>
          <li>
            <code>latency_ms</code> splits embed, search, rerank, and generate.
          </li>
          <li>
            <code>comparison.vector</code> and <code>comparison.reranked</code> are the same candidate list in the two orders.
          </li>
          <li>
            <code>metrics.recall_at_k</code> and <code>metrics.reciprocal_rank</code> are set for the six prepared lab-note questions. Other questions return <code>labeled: false</code>.
          </li>
          <li>The body limit is 20,000 characters. More than 40 requests a minute from one address returns 429.</li>
        </ul>
      </section>
    </div>
  );
}
