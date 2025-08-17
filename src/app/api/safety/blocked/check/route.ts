import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting based on IP (no user ID dependency)
    const rateLimitResult = checkApiRateLimit(
      `safety_check_block_${request.headers.get("x-forwarded-for") ?? "ip"}`,
      100,
      60000
    );
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const { searchParams } = new URL(request.url);
    const targetProfileId = searchParams.get("profileId");
    const targetUserIdParam = searchParams.get("userId");

    if (!targetProfileId && !targetUserIdParam) {
      return errorResponse("Missing profileId or userId parameter", 400);
    }

    // Auth (we require session to know current user)
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId: currentUserId } = session;

    let targetUserId: string = targetUserIdParam || "";
    if (targetProfileId && !targetUserIdParam) {
      // Lookup profile -> user mapping in users collection (assuming profileId stored inside user doc arrays? fallback to direct id)
      // For now treat profileId as userId if direct mapping absent
      targetUserId = targetProfileId;
    }
    if (!targetUserId) return errorResponse("Target user not resolved", 404);

    // Forward (current user blocks target)
    const forwardDocId = `${currentUserId}_${targetUserId}`;
    const reverseDocId = `${targetUserId}_${currentUserId}`;
    const [forwardSnap, reverseSnap] = await Promise.all([
      db.collection("blocks").doc(forwardDocId).get(),
      db.collection("blocks").doc(reverseDocId).get(),
    ]);
    const isBlocked = forwardSnap.exists;
    const isBlockedBy = reverseSnap.exists;
    const canInteract = !isBlocked && !isBlockedBy;

    return successResponse({
      isBlocked,
      isBlockedBy,
      canInteract,
    });
  } catch (error) {
    // avoid noisy logs in production
    if (process.env.NODE_ENV !== "production") {
      console.warn("Safety check block error");
    }
    return errorResponse("Failed to check block status", 500);
  }
}
