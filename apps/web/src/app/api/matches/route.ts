import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse
} from "@/lib/api/handler";
import type { ApiContext } from "@/lib/api/handler";
import { headers } from "next/headers";
import { nowTimestamp } from "@/lib/utils/timestamp";

function getParticipantIds(match: Record<string, unknown>) {
  if (Array.isArray(match.userIds)) {
    return match.userIds.filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
  }

  return [match.user1Id, match.user2Id].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

// GET: Fetch matches for current user
export const GET = createAuthenticatedHandler(async (ctx: ApiContext) => {
  const user = ctx.user;
  if (!user) {
    return errorResponse("Unauthorized", 401, { correlationId: ctx.correlationId });
  }
  const userId = user.userId || user.id;
  
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
          const match = doc.data() as Record<string, unknown>;
          const participantIds = getParticipantIds(match);
          const otherUserId =
            match.user1Id === userId ? match.user2Id : match.user1Id;
          // Fetch profile from users collection
          const userDoc = await db.collection("users").doc(String(otherUserId)).get();
          const profile = userDoc.exists ? userDoc.data() : {};
          const conversationId =
            typeof match.conversationId === "string" && match.conversationId.length > 0
              ? match.conversationId
              : [...participantIds].sort().join("_");

          return {
            id: doc.id,
            user1Id:
              typeof match.user1Id === "string"
                ? match.user1Id
                : participantIds[0] ?? null,
            user2Id:
              typeof match.user2Id === "string"
                ? match.user2Id
                : participantIds[1] ?? null,
            userIds: participantIds,
            conversationId,
            status: typeof match.status === "string" ? match.status : "matched",
            createdAt:
              typeof match.createdAt === "number"
                ? match.createdAt
                : nowTimestamp(),
            updatedAt:
              typeof match.updatedAt === "number"
                ? match.updatedAt
                : typeof match.createdAt === "number"
                  ? match.createdAt
                  : nowTimestamp(),
            lastMessage:
              match.lastMessage && typeof match.lastMessage === "object"
                ? match.lastMessage
                : null,
            matchedUser: {
              id: String(otherUserId),
              displayName:
                typeof profile.fullName === "string" ? profile.fullName : null,
              photoURL: Array.isArray(profile.profileImageUrls)
                ? profile.profileImageUrls[0] ?? null
                : null,
              bio: typeof profile.aboutMe === "string" ? profile.aboutMe : null,
              lastActive:
                typeof profile.updatedAt === "number" ? profile.updatedAt : undefined,
            },
            matchedProfile: {
              userId: String(otherUserId),
              fullName: profile.fullName ?? null,
              city: profile.city ?? null,
              country: profile.country ?? null,
              occupation: profile.occupation ?? null,
              education: profile.education ?? null,
              aboutMe: profile.aboutMe ?? null,
              gender: profile.gender ?? null,
              profileImageUrls: Array.isArray(profile.profileImageUrls)
                ? profile.profileImageUrls
                : [],
            },
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
