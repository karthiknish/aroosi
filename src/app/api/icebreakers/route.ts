import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { applySecurityHeaders } from "@/lib/utils/securityHeaders";

export async function GET(req: NextRequest) {
  try {
    const qs = (await convexQueryWithAuth(
      req,
      (api as any).icebreakers.getDailyQuestions,
      {} as any
    )) as Array<{ id: string; text: string; answered?: boolean }>;
    return applySecurityHeaders(successResponse(qs));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
