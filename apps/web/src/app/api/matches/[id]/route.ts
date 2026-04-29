import { db } from "@/lib/firebaseAdmin";
import { 
  createAuthenticatedHandler, 
  errorResponse, 
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import type { NextRequest } from "next/server";
import { nowTimestamp } from "@/lib/utils/timestamp";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

// GET: Fetch a specific match
export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
  try {
    if (!routeCtx) return errorResponse("Missing context", 400);
    const { id } = await routeCtx.params;
    const userId = ctx.user.id;

    const matchSnap = await db.collection("matches").doc(id).get();

    if (!matchSnap.exists) {
      return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
    }

    const match = matchSnap.data() as Record<string, unknown>;
    const participantIds = getParticipantIds(match);

    if (!participantIds.includes(userId)) {
      return errorResponse("Unauthorized access to match", 403, { correlationId: ctx.correlationId });
    }

    const otherUserId = participantIds.find((uid) => uid !== userId);
    const profileSnap = await db.collection("users").doc(otherUserId).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    return successResponse({
      id: matchSnap.id,
      user1Id:
        typeof match.user1Id === "string" ? match.user1Id : participantIds[0] ?? null,
      user2Id:
        typeof match.user2Id === "string" ? match.user2Id : participantIds[1] ?? null,
      userIds: participantIds,
      conversationId:
        typeof match.conversationId === "string" && match.conversationId.length > 0
          ? match.conversationId
          : [...participantIds].sort().join("_"),
      status: typeof match.status === "string" ? match.status : "matched",
      createdAt:
        typeof match.createdAt === "number" ? match.createdAt : nowTimestamp(),
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
        id: otherUserId,
        displayName: profile?.fullName ?? null,
        photoURL: Array.isArray(profile?.profileImageUrls)
          ? profile.profileImageUrls[0] ?? null
          : null,
        bio: profile?.aboutMe ?? null,
        lastActive: profile?.updatedAt,
      },
      matchedProfile: {
        userId: otherUserId,
        fullName: profile?.fullName ?? null,
        profileImageUrls: Array.isArray(profile?.profileImageUrls)
          ? profile.profileImageUrls
          : [],
        city: profile?.city ?? null,
        country: profile?.country ?? null,
      },
    }, 200, ctx.correlationId);
  } catch (e) {
    console.error("matches/[id] GET error", e);
    return errorResponse("Failed to fetch match", 500, { correlationId: ctx.correlationId });
  }
});

// DELETE: Unmatch
export const DELETE = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
  try {
    if (!routeCtx) return errorResponse("Missing context", 400);
    const { id } = await routeCtx.params;
    const userId = ctx.user.id;

    const matchRef = db.collection("matches").doc(id);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return errorResponse("Match not found", 404, { correlationId: ctx.correlationId });
    }

    const match = matchSnap.data() as Record<string, unknown>;
    const participantIds = getParticipantIds(match);

    if (!participantIds.includes(userId)) {
      return errorResponse("Unauthorized to unmatch", 403, { correlationId: ctx.correlationId });
    }

    if (match.status === "unmatched") {
      return successResponse({ ok: true, alreadyUnmatched: true }, 200, ctx.correlationId);
    }

    await matchRef.set({
      status: "unmatched",
      unmatchedBy: userId,
      unmatchedAt: nowTimestamp(),
    }, { merge: true });

    console.info("matches/[id] DELETE success", {
      matchId: id,
      userId,
      correlationId: ctx.correlationId
    });

    return successResponse({ ok: true }, 200, ctx.correlationId);
  } catch (e) {
    console.error("matches/[id] DELETE error", e);
    return errorResponse("Failed to unmatch", 500, { correlationId: ctx.correlationId });
  }
});
