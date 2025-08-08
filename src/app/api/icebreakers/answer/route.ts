import { NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth } from "@/lib/convexServer";
import { applySecurityHeaders, validateSecurityRequirements } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";

const AnswerSchema = z.object({ questionId: z.string().min(1), answer: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const sec = validateSecurityRequirements(req as unknown as Request);
  if (!sec.valid) return applySecurityHeaders(errorResponse(sec.error ?? "Invalid request", 400));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  }
  try {
    const res = await convexMutationWithAuth(req as any, (api as any).icebreakers.answerIcebreaker, parsed.data as any);
    return applySecurityHeaders(successResponse(res));
  } catch (e: unknown) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
