import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { headers } from "next/headers";

// GET: Fetch matches for current user
export const GET = createAuthenticatedHandler(async (ctx: ApiContext) => {
  const userId = (ctx.user as any).userId || (ctx.user as any).id;
  
  try {
    const reqHeaders = await headers();
    console.info("matches GET", {
      scope: "matches",
      type: "request",
      correlationId: ctx.correlationId,
      userId,
      ip: reqHeaders.get("x-forwarded-for") || null,
    });
    
    // Query matches where user is either user1Id or user2Id and status is "matched"
    const matchesSnap1 = await db
      .collection("matches")
      .where("user1Id", "==", userId)
      .where("status", "==", "matched")
      .get();
    const matchesSnap2 = await db
      .collection("matches")
      .where("user2Id", "==", userId)
      .where("status", "==", "matched")
      .get();
    const allMatches = [...matchesSnap1.docs, ...matchesSnap2.docs];

    // For each match, get the other user's profile
    const results = await Promise.all(
      allMatches.map(
        async (
          doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => {
          const match = doc.data();
          const otherUserId =
            match.user1Id === userId ? match.user2Id : match.user1Id;
          // Fetch profile from users collection
          const userDoc = await db.collection("users").doc(otherUserId).get();
          const profile = userDoc.exists ? userDoc.data() : {};
          return {
            userId: otherUserId,
            fullName: profile.fullName ?? null,
            profileImageUrls: profile.profileImageUrls ?? [],
            createdAt: match.createdAt ?? Date.now(),
          };
        }
      )
    );
    
    console.info("matches GET success", {
      scope: "matches",
      type: "success",
      correlationId: ctx.correlationId,
      statusCode: 200,
      count: results.length,
      durationMs: Date.now() - ctx.startTime,
    });
    
    return successResponse(results, 200, ctx.correlationId);
  } catch (e) {
    console.error("matches GET error", {
      scope: "matches",
      type: "error",
      correlationId: ctx.correlationId,
      message: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - ctx.startTime,
    });
    return errorResponse("Failed to fetch matches", 500, { correlationId: ctx.correlationId });
  }
}, {
  rateLimit: { identifier: "matches_get", maxRequests: 30 }
});
