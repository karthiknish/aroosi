import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

// PATCH: update campaign settings (priority, listId, headers)
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;

  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const { priority, listId, headers } = body;

    const ref = db.collection("marketing_email_campaigns").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return errorResponse("Not found", 404);

    const update: Record<string, unknown> = { updatedAt: nowTimestamp() };
    const existing = (snap.data() as any)?.settings || {};
    const nextSettings: Record<string, unknown> = { ...existing };
    if (priority && ["high", "normal", "low"].includes(priority)) nextSettings.priority = priority;
    if (typeof listId === "string") nextSettings.listId = listId;
    if (headers && typeof headers === "object") {
      nextSettings.headers = { ...(nextSettings.headers as object || {}), ...headers };
    }
    update.settings = nextSettings;

    await ref.set(update, { merge: true });
    return successResponse({ ok: true });
  } catch (e) {
    console.error("marketing campaign settings error", e);
    return errorResponse("Failed to update settings", 500);
  }
}
