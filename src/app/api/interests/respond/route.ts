import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";
import { deterministicMatchId, buildMatch } from "@/lib/firestoreSchema";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

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
    const rl = checkApiRateLimit(
      `interest_respond_${authUserId}`,
      60,
      10 * 60 * 1000
    );
    if (!rl.allowed) return errorResponse("Rate limit exceeded", 429);
    // Load interest
    const interestDoc = await db.collection("interests").doc(interestId).get();
    if (!interestDoc.exists) return errorResponse("Interest not found", 404);
    const interest = interestDoc.data() as any;
    if (interest.toUserId !== authUserId) {
      return errorResponse("Unauthorized to respond to this interest", 403);
    }
    // Block guard
    const blockId1 = `${interest.fromUserId}_${interest.toUserId}`;
    const blockId2 = `${interest.toUserId}_${interest.fromUserId}`;
    const [b1, b2] = await Promise.all([
      db.collection("blocks").doc(blockId1).get(),
      db.collection("blocks").doc(blockId2).get(),
    ]);
    if (b1.exists || b2.exists) {
      return errorResponse("Cannot respond to blocked user", 403);
    }
    // Update status
    await interestDoc.ref.update({ status });
    if (status === "accepted") {
      const matchId = deterministicMatchId(
        interest.fromUserId,
        interest.toUserId
      );
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        const match = buildMatch(interest.fromUserId, interest.toUserId);
        await db.collection("matches").doc(matchId).set(match, { merge: true });
      }
    }
    return successResponse({ success: true, status });
  } catch (error) {
    console.error("Firestore respond interest error", error);
    return errorResponse("Failed to respond to interest", 500);
  }
}
