import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { id } = ctx.params || ({} as any);
  if (!id) return errorResponse("Missing id", 400);
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 50)));
    const after = searchParams.get("after") || undefined;
    const status = searchParams.get("status") || undefined; // queued|retry|sent|error|sending

    let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("emails_outbox")
      .where("metadata.campaignId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(limit);
    if (status) q = q.where("status", "==", status);
    if (after) {
      const afterSnap = await db.collection("emails_outbox").doc(after).get();
      if (afterSnap.exists) {
        q = q.startAfter(afterSnap);
      }
    }
    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1].id : undefined;
    return successResponse({ items, nextCursor });
  } catch (e) {
    return errorResponse("Failed to fetch campaign emails", 500);
  }
}
