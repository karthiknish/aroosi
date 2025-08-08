import { NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { applySecurityHeaders, validateSecurityRequirements } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";

const schema = z.object({ userIds: z.array(z.string().min(1)).min(1).max(200) });

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid) return applySecurityHeaders(errorResponse(sec.error ?? "Invalid request", 400));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  }
  const { userIds } = parsed.data;
  try {
    const profiles = await convexQueryWithAuth(
      req,
      (api as any).quickPicks.getQuickPickProfiles,
      { userIds } as any
    );
    return applySecurityHeaders(successResponse(profiles));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}


