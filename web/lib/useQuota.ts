"use client";

import { useEffect, useState } from "react";

type QuotaState = { remaining: number | null; limit: number; configured: boolean | null };

let state: QuotaState = { remaining: null, limit: 15, configured: null };
const listeners = new Set<(next: QuotaState) => void>();
let loaded = false;

export function updateQuota(payload: { remaining?: unknown; limit?: unknown; configured?: unknown }) {
  state = {
    remaining: typeof payload.remaining === "number" ? payload.remaining : state.remaining,
    limit: typeof payload.limit === "number" ? payload.limit : state.limit,
    configured: typeof payload.configured === "boolean" ? payload.configured : state.configured,
  };
  listeners.forEach((listener) => listener(state));
}

export function useQuota(): QuotaState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    listeners.add(setValue);
    if (!loaded) {
      loaded = true;
      fetch("/api/pdf/quota", { cache: "no-store" })
        .then((response) => response.json())
        .then(updateQuota)
        .catch(() => undefined);
    }
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

export async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; remaining?: number; limit?: number };
    if (response.status === 429) updateQuota({ remaining: 0, limit: payload.limit });
    return payload.error ?? `Request failed with status ${response.status}.`;
  } catch {
    if (response.status === 413) return "The upload is too large. The maximum is 10 MB.";
    if (response.status === 504) return "The server took too long to respond. Try a smaller PDF or try again.";
    return `Request failed with status ${response.status}.`;
  }
}

export function usd(value: number): string {
  return `$${value.toFixed(6)}`;
}

export function ms(value: number): string {
  return `${value < 10 ? value.toFixed(1) : value.toFixed(0)} ms`;
}
