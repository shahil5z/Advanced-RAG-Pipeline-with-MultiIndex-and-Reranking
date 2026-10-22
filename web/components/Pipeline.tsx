const stages = [
  {
    title: "Ingest",
    body: "Read each PDF page and split it into chunks with stable ids.",
  },
  {
    title: "Embed",
    body: "Encode with MiniLM locally, or hashed tokens on the public site.",
  },
  {
    title: "Index",
    body: "Build a Flat, HNSW, or IVF index over those vectors.",
  },
  {
    title: "Retrieve",
    body: "Search by L2 distance and keep the nearest chunks.",
  },
  {
    title: "Rerank",
    body: "Reorder the hits with BM25. A larger score ranks higher.",
  },
  {
    title: "Answer",
    body: "Quote the top passage, or write from it when a key is set.",
  },
];

export function Pipeline() {
  return (
    <section aria-label="Pipeline stages">
      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <span className="pointer-events-none absolute left-8 right-8 top-[18px] hidden h-px bg-line lg:block" aria-hidden="true" />
        {stages.map((stage, index) => (
          <li key={stage.title} className="relative flex flex-col">
            <div className="mb-3 flex lg:justify-center">
              <span className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white ring-4 ring-paper">
                {index + 1}
              </span>
            </div>
            <div className="panel flex-1 p-4 lg:text-center">
              <h3 className="text-lg">{stage.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted">{stage.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
