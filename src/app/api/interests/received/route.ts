import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";

export async function GET(req: NextRequest) {
  try {
    // Cookie-only authentication
    const session = await requireSession(req);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId: authenticatedUserId } = session;

    // Rate limiting for interest queries
    const rateLimitResult = checkApiRateLimit(`interest_received_${authenticatedUserId}`, 100, 60000);
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Get userId from query string
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("Missing userId parameter", 400);
    }

    // Input validation
    if (typeof userId !== "string" || userId.length < 10) {
      return errorResponse("Invalid userId parameter", 400);
    }

    // Security check: users can only query their own interests
    if (userId !== String(authenticatedUserId)) {
      logSecurityEvent("UNAUTHORIZED_ACCESS", {
        userId: String(authenticatedUserId),
        attemptedUserId: userId,
        action: "get_received_interests",
      }, req);
      return errorResponse("Unauthorized: can only view your own interests", 403);
    }

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);

    // Log interest query for monitoring
    console.log(`User ${authenticatedUserId} querying received interests`);

    const result = await convex.query(api.interests.getReceivedInterests, {
      userId: userId as Id<"users">,
    });

    // Validate result
    if (!result || (typeof result !== "object" && !Array.isArray(result))) {
      console.error("Invalid received interests result:", result);
      return errorResponse("Failed to fetch interests", 500);
    }

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching received interests:", error);

    // Log security event for monitoring
    logSecurityEvent("VALIDATION_FAILED", {
      userId: req.url.includes("userId=") ? new URL(req.url).searchParams.get("userId") : "unknown",
      endpoint: "interests/received",
      method: "GET",
      error: error instanceof Error ? error.message : "Unknown error",
    }, req);

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }

    return errorResponse("Failed to fetch received interests", 500);
  }
}