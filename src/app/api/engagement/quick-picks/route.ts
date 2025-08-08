import { NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth, convexQueryWithAuth } from "@/lib/convexServer";
import { applySecurityHeaders, validateSecurityRequirements } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const dayKey = req.nextUrl.searchParams.get("day") || undefined;
  try {
    // Ensure generation first (mutation)
    const picks = await convexMutationWithAuth(
      req,
      (api as any).quickPicks.ensureQuickPicks,
      { dayKey } as any
    );
    // Enrich with minimal profile info
    const profiles = await convexQueryWithAuth(
      req,
      (api as any).quickPicks.getQuickPickProfiles,
      { userIds: picks as any }
    );
    return applySecurityHeaders(successResponse({ userIds: picks, profiles }));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

const actSchema = z.object({ toUserId: z.string().min(1), action: z.enum(["like", "skip"]) });

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid) return applySecurityHeaders(errorResponse(sec.error ?? "Invalid request", 400));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = actSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  }
  const { toUserId, action } = parsed.data;
  try {
    const res = await convexMutationWithAuth(
      req,
      (api as any).quickPicks.actOnQuickPick,
      { toUserId, action } as any
    );
    return applySecurityHeaders(successResponse(res));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}


