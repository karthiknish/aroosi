import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

const COLLECTION = "pushTemplates";

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
