export default function Loading() {
  return (
    <div className="shell space-y-4 py-14" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-muted">Loading…</p>
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-xl bg-wash" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-wash" />
      <div className="h-40 w-full animate-pulse rounded-2xl bg-wash" />
    </div>
  );
}
