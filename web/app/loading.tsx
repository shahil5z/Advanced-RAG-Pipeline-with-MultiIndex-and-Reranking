export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-muted">Loading…</p>
      <div className="h-8 w-2/3 animate-pulse rounded bg-mist" />
      <div className="h-4 w-full animate-pulse rounded bg-mist" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-mist" />
    </div>
  );
}
