import { db } from "@/lib/firebaseAdmin";
import {
  createAuthenticatedHandler,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import type { AuthenticatedApiContext } from "@/lib/api/handler";
import type { NextRequest } from "next/server";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { deterministicMatchId } from "@/lib/firestoreSchema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ParticipantRecord {
  userId: string;
  fullName: string;
  profileImageUrls?: string[];
}

function parseConversationId(conversationId: string): [string, string] | null {
  const parts = String(conversationId)
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

async function buildConversationPayload(conversationId: string, viewerId: string) {
  const participants = parseConversationId(conversationId);

  if (!participants) {
    return { error: errorResponse("Invalid conversation id", 400) };
  }

  if (!participants.includes(viewerId)) {
    return { error: errorResponse("Unauthorized", 403) };
  }

  const [userA, userB] = participants;
  const matchId = deterministicMatchId(userA, userB);
  const matchSnap = await db.collection("matches").doc(matchId).get();

  if (!matchSnap.exists || matchSnap.data()?.status === "unmatched") {
    return { error: errorResponse("Conversation not found", 404) };
  }

  const otherUserId = userA === viewerId ? userB : userA;
  const [otherUserDoc, unreadSnap] = await Promise.all([
    db.collection("users").doc(otherUserId).get(),
    db.collection("messages").where("toUserId", "==", viewerId).get(),
  ]);

  const otherProfile = otherUserDoc.exists
    ? (otherUserDoc.data() as Record<string, unknown>)
    : {};
  const match = matchSnap.data() as Record<string, unknown>;

  let lastMessage: Record<string, unknown> | null = null;
  const rawLastMessage =
    match.lastMessage && typeof match.lastMessage === "object"
      ? (match.lastMessage as Record<string, unknown>)
      : null;

  if (rawLastMessage && typeof rawLastMessage.createdAt === "number") {
    lastMessage = {
      _id: rawLastMessage.id || rawLastMessage._id || "",
      id: rawLastMessage.id || rawLastMessage._id || "",
      fromUserId: rawLastMessage.fromUserId,
      toUserId: rawLastMessage.toUserId,
      content: rawLastMessage.text,
      text: rawLastMessage.text,
      type: rawLastMessage.type || "text",
      timestamp: rawLastMessage.createdAt,
      createdAt: rawLastMessage.createdAt,
      readAt: rawLastMessage.readAt,
      isRead: !!rawLastMessage.readAt,
    };
  } else {
    try {
      const lastMessageSnap = await db
        .collection("messages")
        .where("conversationId", "==", conversationId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!lastMessageSnap.empty) {
        const messageDoc = lastMessageSnap.docs[0];
        const message = messageDoc.data() as Record<string, unknown>;

        lastMessage = {
          _id: messageDoc.id,
          id: messageDoc.id,
          fromUserId: message.fromUserId,
          toUserId: message.toUserId,
          content: message.text,
          text: message.text,
          type: message.type || "text",
          timestamp: message.createdAt,
          createdAt: message.createdAt,
          readAt: message.readAt,
          isRead: !!message.readAt,
        };
      }
    } catch {
      // Ignore missing indexes or query failures and fall back to match metadata.
    }
  }

  const unreadCount = unreadSnap.docs.reduce((count, doc) => {
    const data = doc.data() as Record<string, unknown>;
    if (data.conversationId === conversationId && !data.readAt) {
      return count + 1;
    }
    return count;
  }, 0);

  const createdAt = typeof match.createdAt === "number" ? match.createdAt : nowTimestamp();
  const lastActivity =
    typeof lastMessage?.createdAt === "number" ? lastMessage.createdAt : createdAt;

  const payload = {
    _id: conversationId,
    id: conversationId,
    conversationId,
    participants: [
      { userId: viewerId, fullName: "You" },
      {
        userId: otherUserId,
        fullName:
          typeof otherProfile.fullName === "string" && otherProfile.fullName.trim().length > 0
            ? otherProfile.fullName
            : "Unknown",
        profileImageUrls: Array.isArray(otherProfile.profileImageUrls)
          ? (otherProfile.profileImageUrls as string[])
          : [],
      } satisfies ParticipantRecord,
    ],
    lastMessage,
    lastActivity,
    lastMessageAt: typeof lastMessage?.createdAt === "number" ? lastMessage.createdAt : null,
    unreadCount,
    createdAt,
    updatedAt: lastActivity,
  };

  return { payload };
}

export const GET = createAuthenticatedHandler(
  async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
    try {
      if (!routeCtx) {
        return errorResponse("Missing context", 400, { correlationId: ctx.correlationId });
      }

      const { id } = await routeCtx.params;
      const userId = ctx.user.id;
      const result = await buildConversationPayload(id, userId);

      if (result.error) {
        return result.error;
      }

      return successResponse({ conversation: result.payload }, 200, ctx.correlationId);
    } catch (error) {
      console.error("conversations/[id] GET error", error);
      return errorResponse("Failed to fetch conversation", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    rateLimit: { identifier: "get_conversation", maxRequests: 60 },
  }
);

export const DELETE = createAuthenticatedHandler(
  async (ctx: AuthenticatedApiContext, _req: NextRequest, routeCtx?: RouteContext) => {
    try {
      if (!routeCtx) {
        return errorResponse("Missing context", 400, { correlationId: ctx.correlationId });
      }

      const { id } = await routeCtx.params;
      const participants = parseConversationId(id);

      if (!participants) {
        return errorResponse("Invalid conversation id", 400, { correlationId: ctx.correlationId });
      }

      const userId = ctx.user.id;

      if (!participants.includes(userId)) {
        return errorResponse("Unauthorized", 403, { correlationId: ctx.correlationId });
      }

      const matchId = deterministicMatchId(participants[0], participants[1]);
      const matchRef = db.collection("matches").doc(matchId);
      const matchSnap = await matchRef.get();

      if (!matchSnap.exists) {
        return errorResponse("Conversation not found", 404, { correlationId: ctx.correlationId });
      }

      if (matchSnap.data()?.status === "unmatched") {
        return successResponse({ success: true, alreadyDeleted: true }, 200, ctx.correlationId);
      }

      await matchRef.set(
        {
          status: "unmatched",
          unmatchedBy: userId,
          unmatchedAt: nowTimestamp(),
        },
        { merge: true }
      );

      return successResponse({ success: true }, 200, ctx.correlationId);
    } catch (error) {
      console.error("conversations/[id] DELETE error", error);
      return errorResponse("Failed to delete conversation", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    rateLimit: { identifier: "delete_conversation", maxRequests: 20 },
  }
);