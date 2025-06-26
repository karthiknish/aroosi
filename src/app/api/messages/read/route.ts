import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { validateConversationId } from "@/lib/utils/messageValidation";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`mark_conversation_read_${userId}`, 50, 60000); // 50 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return errorResponse("Invalid request body", 400);
    }

    const { conversationId, userId: requestUserId } = body || {};

    // Validate required fields
    if (!conversationId) {
      return errorResponse("Missing required field: conversationId", 400);
    }

    // Validate conversation ID format
    if (!validateConversationId(conversationId)) {
      return errorResponse("Invalid conversationId format", 400);
    }

    // If userId is provided in request, verify it matches authenticated user
    if (requestUserId && requestUserId !== userId) {
      return errorResponse("Cannot mark conversation as read for another user", 403);
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
    const userIds = conversationId.split('_');
    if (!userIds.includes(userId)) {
      return errorResponse("Unauthorized access to conversation", 403);
    }

    // Mark conversation as read
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }
    
    await client.mutation(api.messages.markConversationRead, {
      conversationId,
      userId: userId as Id<"users">,
    });

    return successResponse({
      message: "Conversation marked as read",
      conversationId,
      userId,
      readAt: Date.now()
    });

  } catch (error) {
    console.error("Error marking conversation as read:", error);
    
    // Check for specific error types
    const isAuthError = error instanceof Error && 
      (error.message.includes("Unauthenticated") || 
       error.message.includes("Unauthorized") ||
       error.message.includes("token"));

    const isPermissionError = error instanceof Error &&
      error.message.includes("permission");
       
    if (isAuthError) {
      return errorResponse("Authentication failed", 401);
    }
    
    if (isPermissionError) {
      return errorResponse("Insufficient permissions to mark this conversation as read", 403);
    }
    
    return errorResponse("Failed to mark conversation as read", 500);
  }
}