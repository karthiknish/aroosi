import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse as Response;
    const authUserId = String(session.userId);

    const rl = checkApiRateLimit(
      `interest_received_${authUserId}`,
      100,
      60_000
    );
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);

    if (!userId) return errorResponse("Missing userId parameter", 400);
    if (userId !== authUserId) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId: authUserId,
          attemptedUserId: userId,
          action: "get_received_interests",
        },
        req
      );
      return errorResponse(
        "Unauthorized: can only view your own interests",
        403
      );
    }

    // Fetch received interests where current user is the target
    const interestsSnap = await db
      .collection("interests")
      .where("toUserId", "==", userId)
      .get();
    const interests = interestsSnap.docs.map((d: any) => d.data());

    // Enrich with basic profile info (fullName, city, profileImageUrls) from users collection
    const enriched = await Promise.all(
      interests.map(async (i: any) => {
        let fromProfile: any = null;
        try {
          const profDoc = await db.collection("users").doc(i.fromUserId).get();
          fromProfile = profDoc.exists ? profDoc.data() : null;
        } catch {}
        return {
          ...i,
          fromProfile: fromProfile
            ? {
                fullName: fromProfile.fullName || null,
                city: fromProfile.city || null,
                profileImageUrls: Array.isArray(fromProfile.profileImageUrls)
                  ? fromProfile.profileImageUrls
                  : [],
              }
            : null,
        };
      })
    );

    return successResponse(enriched);
  } catch (error) {
    console.error("Firestore received interests error", error);
    if (error instanceof Response) return error;
    return errorResponse("Failed to fetch interests", 500);
  }
}
