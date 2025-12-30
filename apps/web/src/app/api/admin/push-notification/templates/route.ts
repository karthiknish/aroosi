import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

type TemplateDoc = {
  name: string;
  description?: string;
  payload: Record<string, any>;
  createdBy: { userId: string; email?: string };
  createdAt: number;
  lastUsedAt?: number;
};

const COLLECTION = "pushTemplates";

export async function GET(request: NextRequest) {
  try {
    const { role } = await requireAuth(request);
    if ((role || "user") !== "admin")
      return errorResponse("Admin privileges required", 403);

    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const items = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    return successResponse({ items });
  } catch (err) {
    console.error("templates list error", err);
    return errorResponse("Failed to list templates", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ((auth.role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const { name, description, payload } = body || {};

  if (!name || typeof name !== "string")
    return errorResponse("Template name is required", 400);
  if (!payload || typeof payload !== "object")
    return errorResponse("Valid payload object is required", 400);

  // Light payload guardrails: ensure core fields exist for convenience
  if (!payload.title || !payload.message) {
    return errorResponse("Payload must include title and message", 400);
  }

  try {
    const doc: TemplateDoc = {
      name: name.trim(),
      description: description ? String(description) : undefined,
      payload,
      createdBy: { userId: auth.userId, email: auth.email },
      createdAt: nowTimestamp(),
    };
    const ref = await db.collection(COLLECTION).add(doc);
    const created = await ref.get();
    return successResponse({ id: ref.id, ...(created.data() as any) }, 201);
  } catch (err) {
    console.error("template create error", err);
    return errorResponse("Failed to save template", 500);
  }
}
