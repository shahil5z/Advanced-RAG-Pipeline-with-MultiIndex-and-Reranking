export function ArchitectureDiagram() {
  const boxes = [
    { x: 16, label: "Documents" },
    { x: 148, label: "Chunks" },
    { x: 280, label: "FAISS / Qdrant" },
    { x: 412, label: "Dense + BM25" },
    { x: 544, label: "RRF" },
    { x: 676, label: "Answer" },
  ];

  return (
    <figure className="panel overflow-x-auto p-4 sm:p-5">
      <figcaption className="text-sm font-semibold">Retrieval path</figcaption>
      <svg viewBox="0 0 820 168" role="img" className="mt-3 h-auto w-full min-w-[640px]" aria-labelledby="arch-title arch-desc">
        <title id="arch-title">Retrieval path</title>
        <desc id="arch-desc">
          Documents become chunks with metadata, are stored in FAISS or Qdrant, searched with dense vectors and BM25, fused with reciprocal rank fusion, then returned as a grounded answer. Traces and request events sit beside that path.
        </desc>
        {boxes.map((box, index) => (
          <g key={box.label}>
            {index > 0 ? <line x1={box.x - 20} y1={48} x2={box.x} y2={48} stroke="#5c6b82" strokeWidth="1.5" /> : null}
            <rect x={box.x} y={24} width="112" height="48" rx="4" fill="#ffffff" stroke="#d5dee8" />
            <text x={box.x + 56} y={52} textAnchor="middle" fill="#101828" fontSize="12" fontFamily="Source Sans 3, sans-serif">
              {box.label}
            </text>
          </g>
        ))}
        <rect x="280" y="100" width="240" height="40" rx="4" fill="#e8eef5" stroke="#d5dee8" />
        <text x="400" y="124" textAnchor="middle" fill="#101828" fontSize="12" fontFamily="Source Sans 3, sans-serif">
          Local traces and request events
        </text>
        <line x1="468" y1="72" x2="400" y2="100" stroke="#5c6b82" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}
