import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

// PATCH: update campaign settings (priority, listId, headers)
export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { id } = ctx.params || ({} as any);
  if (!id) return errorResponse("Missing id", 400);
  try {
    const body = await request.json().catch(() => ({}));
    const priority = body?.priority;
    const listId = body?.listId;
    const headers = body?.headers && typeof body.headers === "object" ? body.headers : undefined;
    const status = body?.status; // 'active' | 'paused' | 'cancelled'
    const maxAttempts = Number.isFinite(body?.maxAttempts) ? Math.max(1, Math.min(10, Number(body.maxAttempts))) : undefined;
    const batchSize = Number.isFinite(body?.batchSize) ? Math.max(1, Math.min(200, Number(body.batchSize))) : undefined;

    const ref = db.collection("marketing_email_campaigns").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return errorResponse("Not found", 404);

    const update: Record<string, unknown> = { updatedAt: Date.now() };
    const existing = (snap.data() as any)?.settings || {};
    const nextSettings: Record<string, unknown> = { ...existing };
    if (priority && ["high", "normal", "low"].includes(priority)) nextSettings.priority = priority;
    if (typeof listId === "string") nextSettings.listId = listId || undefined;
    if (headers) nextSettings.headers = { ...(existing.headers || {}), ...headers };
    if (typeof maxAttempts === 'number') nextSettings.maxAttempts = maxAttempts;
    if (typeof batchSize === 'number') nextSettings.batchSize = batchSize;
    update["settings"] = nextSettings;
    if (status && ["active","paused","cancelled"].includes(status)) update["status"] = status;

    await ref.set(update, { merge: true });
    return successResponse({ ok: true });
  } catch (e) {
    return errorResponse("Failed to update settings", 500);
  }
}
