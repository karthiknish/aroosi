import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  validateMessagePayload,
  validateConversationId,
  validateUserCanMessage,
} from "@/lib/utils/messageValidation";

// Initialize Convex client
const convexClient = getConvexClient();

// GET: Fetch messages for a conversation
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(
      `get_messages_${userId}`,
      100,
      60000,
    ); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");

    // Validate conversation ID format
    if (!conversationId || !validateConversationId(conversationId)) {
      return errorResponse("Invalid or missing conversationId parameter", 400);
    }

    // Validate and sanitize limit parameter
    let limit: number | undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return errorResponse("Invalid limit parameter (must be 1-100)", 400);
      }
      limit = parsedLimit;
    }

    // Validate before parameter for pagination
    let before: number | undefined;
    if (beforeParam) {
      const parsedBefore = parseInt(beforeParam, 10);
      if (isNaN(parsedBefore) || parsedBefore < 0) {
        return errorResponse("Invalid before parameter", 400);
      }
      before = parsedBefore;
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

    // Verify user is part of this conversation
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }
    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403);
    }

    const result = await client.query(api.messages.getMessages, {
      conversationId,
      limit,
      before,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching messages:", error);

    // Check for auth-specific errors
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("token"));

    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to fetch messages",
      isAuthError ? 401 : 500,
    );
  }
}

// POST: Send a message
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for sending messages
    const rateLimitResult = checkApiRateLimit(
      `send_message_${userId}`,
      20,
      60000,
    ); // 20 messages per minute
    if (!rateLimitResult.allowed) {
      return errorResponse(
        "Rate limit exceeded. Please wait before sending more messages.",
        429,
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", 400);
    }

    const { conversationId, fromUserId, toUserId, text } = body || {};

    // Basic required field validation
    if (!conversationId || !fromUserId || !toUserId || !text) {
      return errorResponse(
        "Missing required fields: conversationId, fromUserId, toUserId, text",
        400,
      );
    }

    // Verify the fromUserId matches the authenticated user
    if (fromUserId !== userId) {
      return errorResponse("Cannot send messages as another user", 403);
    }

    // Comprehensive payload validation
    const validation = validateMessagePayload({
      conversationId,
      fromUserId,
      toUserId,
      text,
    });
    if (!validation.isValid) {
      return errorResponse(validation.error || "Invalid message payload", 400);
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

    // Verify users are matched and can message each other
    const canMessage = await validateUserCanMessage(fromUserId, toUserId);
    if (!canMessage) {
      return errorResponse(
        "Users are not authorized to message each other",
        403,
      );
    }

    // Check if either user has blocked the other
    const blockStatus = await client.query(api.safety.getBlockStatus, {
      blockerUserId: fromUserId,
      blockedUserId: toUserId,
    });

    if (blockStatus) {
      return errorResponse("Cannot send message to this user", 403);
    }

    // Use sanitized text from validation
    const sanitizedText = validation.sanitizedText || text;

    const result = await client.mutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: sanitizedText,
    });

    // Broadcast to real-time subscribers
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, result);
    } catch (eventError) {
      console.warn("Failed to broadcast message:", eventError);
      // Don't fail the request if broadcasting fails
    }

    // Track usage for premium users
    // try {
    //   await client.mutation(api.subscription.trackUsage, {
    //     userId: fromUserId,
    //     feature: "message_sent"
    //   });
    // } catch (e) {
    //   // Non-critical, continue
    // }

    return successResponse(result);
  } catch (error) {
    console.error("Error sending message:", error);

    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication") ||
        error.message.includes("Unauthorized"));

    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to send message",
      isAuthError ? 401 : 500,
    );
  }
}
