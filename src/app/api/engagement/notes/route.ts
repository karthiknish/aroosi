import { NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth, convexQueryWithAuth } from "@/lib/convexServer";
import { applySecurityHeaders, validateSecurityRequirements } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";

const setSchema = z.object({ toUserId: z.string().min(1), note: z.string().max(1000) });

export async function GET(req: NextRequest) {
  const toUserId = req.nextUrl.searchParams.get("toUserId");
  if (!toUserId) return applySecurityHeaders(errorResponse("Missing toUserId", 400));
  try {
    const data = await convexQueryWithAuth(
      req,
      (api as any).engagement.getNoteFor,
      { toUserId } as any
    );
    return applySecurityHeaders(successResponse(data));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid) return applySecurityHeaders(errorResponse(sec.error ?? "Invalid request", 400));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  }
  const { toUserId, note } = parsed.data;
  try {
    const res = await convexMutationWithAuth(
      req,
      (api as any).engagement.setNote,
      { toUserId, note } as any
    );
    return applySecurityHeaders(successResponse(res));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}


