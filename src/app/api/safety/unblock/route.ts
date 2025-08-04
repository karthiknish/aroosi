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
    // Enhanced authentication with user ID extraction (cookie-based)
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const userId = authCheck.userId;

    if (!userId) {
      return errorResponse("User ID not found in session", 401);
    }

    // Rate limiting for unblocking actions
    const rateLimitResult = checkApiRateLimit(`safety_unblock_${userId}`, 20, 60000); // 20 unblocks per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded. Please wait before unblocking again.", 429);
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return errorResponse("Missing required field: blockedUserId", 400);
    }

    let client = convexClient;
    if (!client) {
      client = getConvexClient();
    }

    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    // Cookie-only flow for Convex in this endpoint; do not set bearer

    // Unblock the user
    await client.mutation(api.users.unblockUser, {
      blockerUserId: userId as Id<"users">,
      blockedUserId: blockedUserId as Id<"users">,
    });

    return successResponse({
      message: "User unblocked successfully",
    });

  } catch (error) {
    console.error("Error in safety unblock API:", error);
    return errorResponse("Failed to unblock user", 500);
  }
}