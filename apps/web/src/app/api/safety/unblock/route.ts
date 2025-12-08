import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { COL_RECOMMENDATIONS } from "@/lib/firestoreSchema";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    // Rate limiting for unblocking actions
    const rateLimitResult = checkApiRateLimit(
      `safety_unblock_${userId}`,
      20,
      60000
    ); // 20 unblocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before unblocking again.",
        429
      );
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    try {
      const docId = `${userId}_${blockedUserId}`;
      await db.collection("blocks").doc(docId).delete();
    } catch (e) {
      devLog("error", "safety.unblock", "firestore_error", {
        message: e instanceof Error ? e.message : String(e),
      });
      return errorResponse("Failed to unblock user", 500);
    }

    // Invalidate recommendation cache (so previously filtered user can reappear)
    try {
      const snaps = await db
        .collection(COL_RECOMMENDATIONS)
        .where("userId", "==", userId)
        .get();
      if (!snaps.empty) {
        const batch = db.batch();
        snaps.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) =>
          batch.delete(d.ref)
        );
        await batch.commit();
      }
    } catch (e) {
      devLog("warn", "safety.unblock", "recs_cache_invalidate_failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    }

    const res = successResponse({
      message: "User unblocked successfully",
      correlationId,
    });
    devLog("info", "safety.unblock", "success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return res;
  } catch (error) {
    devLog("error", "safety.unblock", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to unblock user", 500);
  }
}
