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
    // Cookie-only authentication with user ID extraction
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    // Rate limiting for blocking actions
    const rateLimitResult = checkApiRateLimit(`safety_block_${userId}`, 20, 60000); // 20 blocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded. Please wait before blocking again.", 429);
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    // Prevent self-blocking
    if (userId === blockedUserId) {
      return errorResponse("Cannot block yourself", 400);
    }

    let client = convexClient || getConvexClient();
    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    // Cookie-only: do not set auth bearer on Convex client

    // Block the user
    await client.mutation(api.users.blockUser, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: blockedUserId as Id<"users">,
    });

    return successResponse({
      message: "User blocked successfully",
    });

  } catch (error) {
    console.error("Error in safety block API:", error);
    return errorResponse("Failed to block user", 500);
  }
}