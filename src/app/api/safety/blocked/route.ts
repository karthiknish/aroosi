import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import type { Id } from "@convex/_generated/dataModel";

// Initialize Convex client
const convexClient = getConvexClient();

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication with user ID extraction (app-layer auth)
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    // Rate limiting for fetching blocked users
    const rateLimitResult = checkApiRateLimit(
      `safety_blocked_${userId}`,
      50,
      60000
    ); // 50 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    let client = convexClient ?? getConvexClient();
    if (!client) {
      return errorResponse("Database connection failed", 500);
    }

    // App-layer auth approach: do NOT pass app JWT to Convex.
    // Authorize by passing user identifiers explicitly to Convex and validating here.

    // Fetch the Convex user for this app user (server-side function should map based on app-layer identity)
    const currentUser = (await client.query(
      api.users.getCurrentUserWithProfile,
      {}
    )) as { _id: Id<"users"> } | null;

    if (!currentUser) {
      return errorResponse("User record not found", 404);
    }

    // Get blocked users by explicit user id
    const blockedUsers = await client.query(api.safety.getBlockedUsers, {
      blockerUserId: currentUser._id,
    });

    return successResponse({
      blockedUsers: blockedUsers || [],
    });
  } catch (error) {
    console.error("Error in safety blocked users API:", error);
    return errorResponse("Failed to fetch blocked users", 500);
  }
}