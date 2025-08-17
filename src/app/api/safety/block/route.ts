import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession, devLog } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { db } from "@/lib/firebaseAdmin";
import { COL_RECOMMENDATIONS } from "@/lib/firestoreSchema";

// In-memory short cooldown map per (blocker, target)
const perTargetCooldown = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    // Cookie-only authentication with user ID extraction
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    // Rate limiting for blocking actions
    const rateLimitResult = checkApiRateLimit(
      `safety_block_${userId}`,
      20,
      60000
    ); // 20 blocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before blocking again.",
        429
      );
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    // Prevent self-blocking
    if (userId === blockedUserId) {
      return errorResponse("Cannot block yourself", 400);
    }

    // Per-target cooldown: prevent repeated blocks within 60 seconds for same target
    const key = `${userId}_${blockedUserId}`;
    const now = Date.now();
    const last = perTargetCooldown.get(key) || 0;
    if (now - last < 60_000) {
      return errorResponse("Please wait before blocking this user again", 429);
    }

    // Persist block relation in Firestore (collection: blocks, docId: `${blocker}_${blocked}`)
    try {
      const docId = `${userId}_${blockedUserId}`;
      await db.collection("blocks").doc(docId).set(
        {
          blockerId: userId,
          blockedUserId,
          createdAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      devLog("error", "safety.block", "firestore_error", {
        message: e instanceof Error ? e.message : String(e),
      });
      return errorResponse("Failed to block user", 500);
    }

    perTargetCooldown.set(key, now);

    // Invalidate recommendation cache for blocker (and optionally blocked user) by deleting stale rec docs
    try {
      const nowTs = Date.now();
      const snaps = await db
        .collection(COL_RECOMMENDATIONS)
        .where("userId", "in", [userId, blockedUserId])
        .where("expiresAt", ">", nowTs - 30 * 60 * 1000)
        .get();
      const batch = db.batch();
      snaps.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) =>
        batch.delete(d.ref)
      );
      if (!snaps.empty) await batch.commit();
    } catch (e) {
      devLog("warn", "safety.block", "recs_cache_invalidate_failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    }

    return successResponse({
      message: "User blocked successfully",
    });
  } catch (error) {
    devLog("error", "safety.block", "unhandled_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("Failed to block user", 500);
  }
}
