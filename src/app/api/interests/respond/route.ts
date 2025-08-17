import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

// POST: respond to an interest (accepted | rejected)
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if ("errorResponse" in session) return session.errorResponse as Response;
  const authUserId = String(session.userId);

  let body: { interestId?: string; status?: "accepted" | "rejected" } = {};
  try {
    body = await req.json();
  } catch {}
  const { interestId, status } = body;
  if (!interestId || (status !== "accepted" && status !== "rejected")) {
    return errorResponse("Missing or invalid interestId or status", 400);
  }
  try {
    // Load interest
    const interestDoc = await db.collection("interests").doc(interestId).get();
    if (!interestDoc.exists) return errorResponse("Interest not found", 404);
    const interest = interestDoc.data() as any;
    if (interest.toUserId !== authUserId) {
      return errorResponse("Unauthorized to respond to this interest", 403);
    }
    // Update status
    await interestDoc.ref.update({ status });

    if (status === "accepted") {
      // Check for mutual accepted interest to create a match
      const reverseSnap = await db
        .collection("interests")
        .where("fromUserId", "==", interest.toUserId)
        .where("toUserId", "==", interest.fromUserId)
        .where("status", "==", "accepted")
        .limit(1)
        .get();
      if (!reverseSnap.empty) {
        // Ensure no existing match in either ordering
        const m1 = await db
          .collection("matches")
          .where("user1Id", "==", interest.fromUserId)
          .where("user2Id", "==", interest.toUserId)
          .limit(1)
          .get();
        const m2 = await db
          .collection("matches")
          .where("user1Id", "==", interest.toUserId)
          .where("user2Id", "==", interest.fromUserId)
          .limit(1)
          .get();
        if (m1.empty && m2.empty) {
          const conversationId = [interest.fromUserId, interest.toUserId]
            .sort()
            .join("_");
          await db.collection("matches").add({
            user1Id: interest.fromUserId,
            user2Id: interest.toUserId,
            status: "matched",
            createdAt: Date.now(),
            conversationId,
          });
        }
      }
    }
    return successResponse({ success: true, status });
  } catch (error) {
    console.error("Firestore respond interest error", error);
    return errorResponse("Failed to respond to interest", 500);
  }
}
