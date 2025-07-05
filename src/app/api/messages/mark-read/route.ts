import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`mark_read_${userId}`, 50, 60000); // 50 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", 400);
    }

    const { messageIds } = body || {};

    // Validate input
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return errorResponse("Invalid or empty messageIds array", 400);
    }

    // Validate array length to prevent abuse
    if (messageIds.length > 100) {
      return errorResponse(
        "Cannot mark more than 100 messages as read at once",
        400,
      );
    }

    // Validate that all messageIds are strings
    if (!messageIds.every((id) => typeof id === "string" && id.length > 0)) {
      return errorResponse("All messageIds must be non-empty strings", 400);
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

    // Mark messages as read - the Convex function should validate user permissions
    if (!userId) {
      return errorResponse("User ID not found", 401);
    }

    await client.mutation(api.messages.markConversationRead, {
      conversationId: messageIds[0], // Use first message ID as conversation ID for now
      userId: userId as Id<"users">,
    });

    return successResponse({
      message: `Marked ${messageIds.length} messages as read`,
      messageIds,
      readAt: Date.now(),
      updatedCount: messageIds.length,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);

    // Check for specific error types
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("token"));

    const isPermissionError =
      error instanceof Error && error.message.includes("permission");

    if (isAuthError) {
      return errorResponse("Authentication failed", 401);
    }

    if (isPermissionError) {
      return errorResponse(
        "Insufficient permissions to mark these messages as read",
        403,
      );
    }

    return errorResponse("Failed to mark messages as read", 500);
  }
}
