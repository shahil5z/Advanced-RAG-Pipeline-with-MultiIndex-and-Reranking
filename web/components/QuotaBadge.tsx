"use client";

import { useQuota } from "@/lib/useQuota";

export function QuotaBadge() {
  const quota = useQuota();
  if (quota.configured === false) {
    return (
      <p className="rounded-xl border border-accent/40 bg-wash px-3 py-2 text-sm leading-6" role="status">
        The live demo is not configured on this server because the OpenAI key is missing. Uploads and questions are disabled.
      </p>
    );
  }
  return (
    <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm shadow-card" aria-live="polite">
      <span className="font-semibold">{quota.remaining === null ? `${quota.limit} tests per day` : `${quota.remaining} of ${quota.limit} tests left today`}</span>
      <span className="text-muted">Shared by PDF uploads, PDF questions and lab-note questions.</span>
    </p>
  );
}
