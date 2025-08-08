import { NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth, convexMutationWithAuth } from "@/lib/convexServer";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { applySecurityHeaders, checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  // light rate limit
  const rl = checkApiRateLimit("admin_icebreakers_list", 60, 60_000);
  if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  try {
    const items = await convexQueryWithAuth(req, (api as any).icebreakers.listQuestions, {} as any);
    return applySecurityHeaders(successResponse({ items }));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

const CreateSchema = z.object({
  text: z.string().min(3).max(300),
  category: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const rl = checkApiRateLimit("admin_icebreakers_create", 30, 60_000);
  if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  try {
    const res = await convexMutationWithAuth(req as any, (api as any).icebreakers.createQuestion, parsed.data as any);
    return applySecurityHeaders(successResponse(res));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(3).max(300).optional(),
  category: z.string().trim().max(100).optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0).max(100).optional(),
}).refine((v) => {
  const { id, ...rest } = v as any;
  return Object.keys(rest).length > 0;
}, { message: "At least one field to update is required" });

export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const rl = checkApiRateLimit("admin_icebreakers_update", 60, 60_000);
  if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  const { id, ...patch } = parsed.data;
  try {
    const res = await convexMutationWithAuth(req as any, (api as any).icebreakers.updateQuestion, { id, ...patch } as any);
    return applySecurityHeaders(successResponse(res));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const rl = checkApiRateLimit("admin_icebreakers_delete", 30, 60_000);
  if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return applySecurityHeaders(errorResponse("Validation failed", 422, { issues: parsed.error.flatten() }));
  try {
    const res = await convexMutationWithAuth(req as any, (api as any).icebreakers.deleteQuestion, parsed.data as any);
    return applySecurityHeaders(successResponse(res));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
