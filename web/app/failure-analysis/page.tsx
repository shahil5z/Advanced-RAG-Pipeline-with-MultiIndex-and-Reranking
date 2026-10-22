import type { Metadata } from "next";

import failures from "@/data/failures.json";

export const metadata: Metadata = {
  title: "Failure Analysis",
  description: "Questions where stored flat baseline recall was below 1.",
};

export default function FailurePage() {
  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">Failure analysis</h1>
        <p className="leading-7 text-muted">
          {failures.note} {failures.retrieval_misses} questions have recall 0 (`retrieval_miss`). {failures.partial_page_coverage} are partial (`partial_page_coverage`). Semantic, lexical, document, page, boundary, distractor, and filter labels were not assigned.
        </p>
      </header>

      <div className="overflow-x-auto border border-line bg-card">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-line bg-wash text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Id</th>
              <th className="px-3 py-2 font-semibold">Question</th>
              <th className="px-3 py-2 font-semibold">Expected pages</th>
              <th className="px-3 py-2 font-semibold">Retrieved pages</th>
              <th className="px-3 py-2 font-semibold">Recall@5</th>
              <th className="px-3 py-2 font-semibold">Category</th>
            </tr>
          </thead>
          <tbody>
            {failures.failures.map((item) => (
              <tr key={item.id} className="border-b border-line align-top last:border-0">
                <th className="px-3 py-3 font-semibold">{item.id}</th>
                <td className="px-3 py-3">{item.question}</td>
                <td className="px-3 py-3">
                  {item.expected_pages.map((page) => (
                    <span key={`${page.document_id}-${page.page}`} className="block">
                      {page.document_id} p{page.page}
                    </span>
                  ))}
                </td>
                <td className="px-3 py-3">not stored</td>
                <td className="px-3 py-3 tabular-nums">{item.recall_at_k.toFixed(3)}</td>
                <td className="px-3 py-3">{item.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-2xl">Cause and mitigation</h2>
        <p className="leading-7">{failures.failures[0]?.likely_cause}</p>
        <p className="leading-7 text-muted">{failures.failures[0]?.mitigation}</p>
      </section>
    </div>
  );
}
