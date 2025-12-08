import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);
  const { id } = await params;
  if (!id) return errorResponse("id required", 400);
  const doc = await db.collection("emailTemplates").doc(id).get();
  if (!doc.exists) return errorResponse("Not found", 404);
  return successResponse({ id: doc.id, ...(doc.data() as any) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);
  const { id } = await params;
  if (!id) return errorResponse("id required", 400);
  await db.collection("emailTemplates").doc(id).delete();
  return successResponse({ deleted: true });
}
