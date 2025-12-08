import { NextRequest } from "next/server";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { requireSessionAllowBanned } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const res = await requireSessionAllowBanned(req);
  if ("errorResponse" in res) return res.errorResponse;
  try {
    const body = await req.json().catch(() => ({} as any));
    const reason = (body?.reason || "").toString().trim();
    const details = (body?.details || "").toString().trim();
    if (!reason || !details) return errorResponse("Missing reason or details", 400);

    const now = Date.now();
    const appealRef = db.collection(COLLECTIONS.APPEALS || "appeals").doc();
    await appealRef.set({
      id: appealRef.id,
      userId: res.userId,
      reason,
      details,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return successResponse({ id: appealRef.id });
  } catch (e) {
    return errorResponse("Failed to submit appeal", 500);
  }
}


