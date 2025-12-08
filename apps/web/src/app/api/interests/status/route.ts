import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

// Firestore implementation for interest status lookup.
// Status semantics mirror legacy Convex version:
//  - null/"none" when no interest found
//  - "pending" | "accepted" | "rejected" from stored document
//  - "mutual" convenience state when both directions are accepted (returned as status: "mutual")
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let fromUserId = searchParams.get("fromUserId");
  let toUserId = searchParams.get("toUserId");
  const targetUserId = searchParams.get("targetUserId");

  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse as Response;
    const authUserId = String(session.userId);

    const rl = checkApiRateLimit(`interest_status_${authUserId}`, 200, 60_000);
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);

    // Backward compatibility: if client only supplies targetUserId, infer direction with current user as sender
    if (!fromUserId && !toUserId && targetUserId) {
      fromUserId = authUserId;
      toUserId = targetUserId;
    }

    if (!fromUserId || !toUserId)
      return errorResponse(
        "Missing fromUserId/toUserId or targetUserId parameter",
        400
      );

    if (fromUserId !== authUserId && toUserId !== authUserId) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId: authUserId,
          attemptedFromUserId: fromUserId,
          attemptedToUserId: toUserId,
          action: "get_interest_status",
        },
        req
      );
      return errorResponse(
        "Unauthorized: can only check interest status involving yourself",
        403
      );
    }

    // Fetch interest doc from from->to
    const interestSnap = await db
      .collection("interests")
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", toUserId)
      .limit(1)
      .get();
    const interest = interestSnap.empty ? null : interestSnap.docs[0].data();

    if (!interest) return successResponse({ status: null });

    let status = interest.status as string | null;
    if (status === "accepted") {
      // Check reverse acceptance for mutual convenience flag
      const reverseSnap = await db
        .collection("interests")
        .where("fromUserId", "==", toUserId)
        .where("toUserId", "==", fromUserId)
        .where("status", "==", "accepted")
        .limit(1)
        .get();
      if (!reverseSnap.empty) status = "mutual"; // surface mutual
    }
    return successResponse({ status });
  } catch (error) {
    console.error("Firestore interest status error", error);
    if (error instanceof Response) return error; // already formatted
    return errorResponse("Failed to fetch interest status", 500);
  }
}
