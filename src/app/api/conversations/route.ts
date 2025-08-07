import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// GET: Fetch conversations for a user
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    try {
      const { userId } = await requireAuth(request);
      // Rate limiting continues below
    } catch (e) {
      const err = e as AuthError;
      const status = typeof err?.status === "number" ? err.status : 401;
      console.warn("Conversations auth failed", {
        scope: "conversations.list",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status });
    }
    const { userId } = await requireAuth(request);

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(
      `get_conversations_${userId}`,
      60,
      60000
    );
    if (!rateLimitResult.allowed) {
      console.warn("Conversations rate limited", {
        scope: "conversations.list",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Rate limit exceeded", correlationId },
        { status: 429 }
      );
    }

    // Database operations now via fetchQuery with server identity

    // Do not forward bearer tokens; server identity is used in Convex
    // No client.setAuth call in cookie-only model.

    if (!userId) {
      console.warn("Conversations missing userId", {
        scope: "conversations.list",
        type: "missing_user",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    // Get user's matches which represent conversations
    const matches = await fetchQuery(api.users.getMyMatches, {}).catch((e: unknown) => {
      console.error("Conversations getMyMatches error", {
        scope: "conversations.list",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return [] as Array<{ userId: string; fullName?: string | null; profileImageUrls?: string[] | null; createdAt?: number | null }>;
    });

    // Get unread counts for each conversation
    const unreadCounts = await fetchQuery(api.messages.getUnreadCountsForUser, {
      userId: userId as Id<"users">,
    }).catch((e: unknown) => {
      console.error("Conversations getUnreadCounts error", {
        scope: "conversations.list",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return {} as Record<string, number>;
    });

    // Transform matches into conversation format
    const conversations = await Promise.all(
      (matches || [])
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map(async (m: { userId: string; fullName?: string | null; profileImageUrls?: string[] | null; createdAt?: number | null }) => {
          // Narrowing guard to satisfy TS even inside async mapper
          const match = m as {
            userId: string;
            fullName?: string | null;
            profileImageUrls?: string[] | null;
            createdAt?: number | null;
          };

          const conversationId = [String(userId), match.userId].sort().join("_");

          // Get last message for this conversation
           const messages = await fetchQuery(api.messages.getMessages, {
             conversationId,
             limit: 1,
           }).catch(() => [] as Array<any>);          const lastMessage =
            messages.length > 0 ? messages[messages.length - 1] : null;

          return {
            _id: conversationId,
            id: conversationId,
            conversationId,
            participants: [
              {
                userId: String(userId),
                firstName: "You",
              },
              {
                userId: match.userId,
                firstName: match.fullName || "Unknown",
                profileImageUrls: match.profileImageUrls || [],
              },
            ],
            lastMessage: lastMessage
              ? {
                  _id: lastMessage._id,
                  id: lastMessage._id,
                  senderId: lastMessage.fromUserId,
                  fromUserId: lastMessage.fromUserId,
                  toUserId: lastMessage.toUserId,
                  content: lastMessage.text,
                  text: lastMessage.text,
                  type: lastMessage.type || "text",
                  timestamp: lastMessage.createdAt || lastMessage._creationTime,
                  createdAt: lastMessage.createdAt || lastMessage._creationTime,
                  _creationTime: lastMessage._creationTime,
                  readAt: lastMessage.readAt,
                  isRead: !!lastMessage.readAt,
                }
              : null,
            lastActivity:
              lastMessage?.createdAt ||
              lastMessage?._creationTime ||
              match.createdAt ||
              Date.now(),
            lastMessageAt: lastMessage?.createdAt || lastMessage?._creationTime,
            unreadCount:
              (unreadCounts as Record<string, number>)[match.userId] || 0,
            createdAt: match.createdAt || Date.now(),
            updatedAt:
              lastMessage?.createdAt ||
              lastMessage?._creationTime ||
              match.createdAt ||
              Date.now(),
          };
        })
    );

    // Sort by last activity (most recent first)
    conversations.sort((a: any, b: any) => b.lastActivity - a.lastActivity);

    const response = NextResponse.json({
      conversations,
      total: conversations.length,
      correlationId,
    });

    console.info("Conversations list success", {
      scope: "conversations.list",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      total: conversations.length,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Conversations list unhandled error", {
      scope: "conversations.list",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to fetch conversations", details: message, correlationId },
      { status: 500 }
    );
  }
}
