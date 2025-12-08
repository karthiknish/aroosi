import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { processEmailBatch } from "@/lib/emailQueue";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    let limit: number | undefined;
    try {
      const body = await request.json();
      limit = Number((body as any)?.limit);
      // eslint-disable-next-line no-empty
    } catch {}
    const sp = new URL(request.url).searchParams;
    if (!Number.isFinite(limit as number)) {
      limit = Number(sp.get("limit"));
    }
    limit = Math.max(1, Math.min(50, Number(limit || 10)));
    const results = await processEmailBatch(limit);
    return successResponse({ processed: results.length, results });
  } catch (e) {
    return errorResponse("Failed to process outbox", 500);
  }
}
