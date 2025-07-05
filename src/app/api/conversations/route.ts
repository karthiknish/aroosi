import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// Initialize Convex client
const convexClient = getConvexClient();

// GET: Fetch conversations for a user
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(
      `get_conversations_${userId}`,
      60,
      60000,
    ); // 60 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Database operations
    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    client.setAuth(token);

    if (!userId) {
      return errorResponse("User ID not found", 401);
    }

    // Get user's matches which represent conversations
    const matches = await client.query(api.users.getMyMatches, {});

    // Get unread counts for each conversation
    const unreadCounts = await client.query(
      api.messages.getUnreadCountsForUser,
      {
        userId: userId as Id<"users">,
      },
    );

    // Transform matches into conversation format
    const conversations = await Promise.all(
      matches
        .filter((match): match is NonNullable<typeof match> => match !== null)
        .map(async (match) => {
          const conversationId = [userId, match.userId].sort().join("_");

          // Get last message for this conversation
          const messages = await client.query(api.messages.getMessages, {
            conversationId,
            limit: 1,
          });

          const lastMessage =
            messages.length > 0 ? messages[messages.length - 1] : null;

          return {
            _id: conversationId,
            id: conversationId,
            conversationId,
            participants: [
              {
                userId: userId,
                firstName: "You", // This would be the current user
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
            unreadCount: unreadCounts[match.userId] || 0,
            createdAt: match.createdAt || Date.now(),
            updatedAt:
              lastMessage?.createdAt ||
              lastMessage?._creationTime ||
              match.createdAt ||
              Date.now(),
          };
        }),
    );

    // Sort by last activity (most recent first)
    conversations.sort((a, b) => b.lastActivity - a.lastActivity);

    return successResponse({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);

    // Check for auth-specific errors
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("token"));

    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to fetch conversations",
      isAuthError ? 401 : 500,
    );
  }
}
