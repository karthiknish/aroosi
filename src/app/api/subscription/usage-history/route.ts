import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { db } from "@/lib/firebaseAdmin";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const days = Math.max(
      1,
      Math.min(30, Number(url.searchParams.get("days") || 7))
    );
    const limit = Math.max(
      1,
      Math.min(500, Number(url.searchParams.get("limit") || 100))
    );
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const snap = await db
      .collection(COL_USAGE_EVENTS)
      .where("userId", "==", auth.userId)
      .where("timestamp", ">=", cutoff)
      .get();
    let events = snap.docs.map(
      (
        d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => ({ id: d.id, ...(d.data() as any) })
    );
    events.sort((a: any, b: any) => b.timestamp - a.timestamp);
    events = events.slice(0, limit);
    return successResponse(events);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return errorResponse("Failed to fetch usage history", 500, {
      details: msg,
    });
  }
}
