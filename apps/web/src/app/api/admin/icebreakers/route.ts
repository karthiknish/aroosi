import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/app/api/_utils/auth";
import {
  applySecurityHeaders,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  // light rate limit
  const rl = checkApiRateLimit("admin_icebreakers_list", 60, 60_000);
  if (!rl.allowed) return applySecurityHeaders(errorResponse("Rate limit exceeded", 429));
  try {
    const snap = await db.collection("icebreakerQuestions").get();
    const items: any[] = [];
    snap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data() as any;
      items.push({
        id: doc.id,
        text: d.text,
        active: !!d.active,
        category: d.category ?? null,
        weight: typeof d.weight === "number" ? d.weight : null,
        createdAt: d.createdAt || Date.now(),
      });
    });
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
    const now = Date.now();
    const docRef = await db
      .collection("icebreakerQuestions")
      .add({
        ...parsed.data,
        active: parsed.data.active ?? true,
        createdAt: now,
      });
    return applySecurityHeaders(successResponse({ id: docRef.id }));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(3).max(300).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  active: z.boolean().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
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
    await db
      .collection("icebreakerQuestions")
      .doc(id)
      .set(patch, { merge: true });
    return applySecurityHeaders(successResponse({ success: true }));
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
    await db.collection("icebreakerQuestions").doc(parsed.data.id).delete();
    return applySecurityHeaders(successResponse({ success: true }));
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}
