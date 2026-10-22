"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="text-sm leading-6 text-muted">This page could not be displayed. The rest of the site is still available.</p>
      <button type="button" className="btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
