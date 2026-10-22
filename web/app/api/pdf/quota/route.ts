import { hasKey } from "@/lib/openai/client";
import { checkQuota, quotaHeaders } from "@/lib/pdf/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quota = checkQuota(request);
  return Response.json(
    { remaining: quota.remaining, limit: quota.limit, configured: hasKey() },
    { headers: quotaHeaders(quota) },
  );
}
