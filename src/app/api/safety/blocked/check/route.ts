import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

// Initialize Convex client
const convexClient = getConvexClient();

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication with user ID extraction
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for checking block status
    const rateLimitResult = checkApiRateLimit(`safety_check_block_${userId}`, 100, 60000); // 100 checks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return errorResponse("Missing required parameter: userId", 400);
    }

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    // Set authentication token
    client.setAuth(token);

    // Check block status
    const blockStatus = await client.query(api.safety.getBlockStatus, {
      blockerUserId: userId as any,
      blockedUserId: targetUserId as any,
    });

    return successResponse({
      isBlocked: !!blockStatus,
      isBlockedBy: false, // Would need reverse check
      canInteract: !blockStatus,
    });

  } catch (error) {
    console.error("Error in safety check block API:", error);
    return errorResponse("Failed to check block status", 500);
  }
}