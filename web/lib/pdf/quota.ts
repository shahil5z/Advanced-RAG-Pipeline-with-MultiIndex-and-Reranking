import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { DAILY_LIMIT } from "./limits";

export const COOKIE = "pdfqa_quota";

type CookieState = { id: string; day: string; used: number };

const byIp = new Map<string, { day: string; used: number }>();

function secret(): string {
  const base = process.env.QUOTA_SECRET?.trim() || process.env.OPENAI_API_KEY?.trim() || "local-development-only";
  return createHash("sha256").update(`pdfqa-quota-v1:${base}`).digest("hex");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeState(state: CookieState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeState(value: string | undefined): CookieState | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CookieState;
    if (typeof state.id !== "string" || typeof state.day !== "string" || !Number.isInteger(state.used)) return null;
    return state;
  } catch {
    return null;
  }
}

function readCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return undefined;
}

function ipHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 32);
}

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
  cookie: string;
  commit: () => QuotaCheck;
};

function cookieHeader(state: CookieState): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeState(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=172800${secure}`;
}

export function checkQuota(request: Request, limit = DAILY_LIMIT): QuotaCheck {
  const day = today();
  const parsed = decodeState(readCookie(request));
  const state: CookieState = parsed && parsed.day === day ? parsed : { id: parsed?.id ?? randomUUID(), day, used: 0 };
  const key = ipHash(request);
  const ipRow = byIp.get(key);
  const ipUsed = ipRow && ipRow.day === day ? ipRow.used : 0;
  const used = Math.max(state.used, ipUsed);
  const build = (count: number): QuotaCheck => ({
    allowed: count < limit,
    used: count,
    remaining: Math.max(0, limit - count),
    limit,
    cookie: cookieHeader({ ...state, used: count }),
    commit: () => {
      const next = count + 1;
      if (byIp.size > 10_000) byIp.clear();
      byIp.set(key, { day, used: Math.max(next, ipUsed) });
      return { ...build(next), allowed: true };
    },
  });
  return build(used);
}

export function quotaHeaders(check: QuotaCheck): Record<string, string> {
  return {
    "Set-Cookie": check.cookie,
    "Cache-Control": "no-store",
    "X-Quota-Remaining": String(check.remaining),
  };
}

export function limitResponse(check: QuotaCheck): Response {
  return Response.json(
    { error: `Daily limit reached: ${check.limit} tests per day. Try again tomorrow (UTC).`, remaining: 0, limit: check.limit },
    { status: 429, headers: quotaHeaders(check) },
  );
}
