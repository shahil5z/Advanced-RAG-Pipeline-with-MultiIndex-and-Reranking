import { checkQuota, quotaHeaders } from "@/lib/pdf/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quota = checkQuota(request);
  return Response.json(
    { remaining: quota.remaining, limit: quota.limit, configured: Boolean(process.env.OPENAI_API_KEY?.trim()) },
    { headers: quotaHeaders(quota) },
  );
}
