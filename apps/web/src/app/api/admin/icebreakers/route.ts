import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import {
  applySecurityHeaders,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import {
  adminIcebreakersCreateSchema,
  adminIcebreakersUpdateSchema,
  adminIcebreakersDeleteSchema,
} from "@/lib/validation/apiSchemas/adminIcebreakers";

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
        createdAt: d.createdAt || nowTimestamp(),
      });
    });
    return applySecurityHeaders(successResponse({ items }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(
      errorResponse("Failed to load icebreakers", 500, {
        details: { message: msg },
      })
    );
  }
}

const CreateSchema = adminIcebreakersCreateSchema;

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
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        details: { issues: parsed.error.flatten() },
      })
    );
  try {
    const now = nowTimestamp();
    const docRef = await db
      .collection("icebreakerQuestions")
      .add({
        ...parsed.data,
        active: parsed.data.active ?? true,
        createdAt: now,
      });
    return applySecurityHeaders(successResponse({ id: docRef.id }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(
      errorResponse("Failed to create icebreaker", 500, {
        details: { message: msg },
      })
    );
  }
}

const UpdateSchema = adminIcebreakersUpdateSchema;

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
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        details: { issues: parsed.error.flatten() },
      })
    );
  const { id, ...patch } = parsed.data;
  try {
    await db
      .collection("icebreakerQuestions")
      .doc(id)
      .set(patch, { merge: true });
    return applySecurityHeaders(successResponse({ success: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(
      errorResponse("Failed to update icebreaker", 500, {
        details: { message: msg },
      })
    );
  }
}

const DeleteSchema = adminIcebreakersDeleteSchema;

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
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        details: { issues: parsed.error.flatten() },
      })
    );
  try {
    await db.collection("icebreakerQuestions").doc(parsed.data.id).delete();
    return applySecurityHeaders(successResponse({ success: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return applySecurityHeaders(
      errorResponse("Failed to delete icebreaker", 500, {
        details: { message: msg },
      })
    );
  }
}
