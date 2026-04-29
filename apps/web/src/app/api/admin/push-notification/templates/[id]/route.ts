import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

const COLLECTION = "pushTemplates";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth(request);
  if ((role || "user") !== "admin") {
    return errorResponse("Admin privileges required", 403);
  }

  const { id } = await params;
  if (!id) return errorResponse("Missing template id", 400);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return errorResponse("Template name is required", 400);
    }
    updates.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updates.description = body.description ? String(body.description).trim() : "";
  }

  if (body.payload !== undefined) {
    const payload = body.payload;
    if (!payload || typeof payload !== "object") {
      return errorResponse("Valid payload object is required", 400);
    }
    const typedPayload = payload as { title?: string; message?: string };
    if (!typedPayload.title || !typedPayload.message) {
      return errorResponse("Payload must include title and message", 400);
    }
    updates.payload = payload;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("No template updates provided", 400);
  }

  try {
    const ref = db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return errorResponse("Template not found", 404);

    await ref.set({ ...updates, updatedAt: nowTimestamp() }, { merge: true });
    const updated = await ref.get();
    return successResponse({ id, ...((updated.data() as Record<string, unknown> | undefined) || {}) });
  } catch (err) {
    console.error("template update error", err);
    return errorResponse("Failed to update template", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);
  const { id } = await params;
  if (!id) return errorResponse("Missing template id", 400);
  try {
    const ref = db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return errorResponse("Template not found", 404);
    await ref.delete();
    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("template delete error", err);
    return errorResponse("Failed to delete template", 500);
  }
}
