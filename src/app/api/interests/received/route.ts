import { NextRequest } from "next/server";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";
import { checkApiRateLimit, logSecurityEvent } from "@/lib/utils/securityHeaders";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(req: NextRequest) {
  try {
    const { userId: authenticatedUserId } = await requireAuth(req);

    const rateLimitResult = checkApiRateLimit(
      `interest_received_${authenticatedUserId}`,
      100,
      60000
    );
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return errorResponse("Missing userId parameter", 400);
    }

    if (typeof userId !== "string" || userId.length < 10) {
      return errorResponse("Invalid userId parameter", 400);
    }

    if (userId !== String(authenticatedUserId)) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId: String(authenticatedUserId),
          attemptedUserId: userId,
          action: "get_received_interests",
        },
        req
      );
      return errorResponse("Unauthorized: can only view your own interests", 403);
    }

    console.log(`User ${authenticatedUserId} querying received interests`);

    const result = await convexQueryWithAuth(
      req,
      (await import("@convex/_generated/api")).api.interests.getReceivedInterests,
      { userId: userId as Id<"users"> }
    );

    if (!result || (typeof result !== "object" && !Array.isArray(result))) {
      console.error("Invalid received interests result:", result);
      return errorResponse("Failed to fetch interests", 500);
    }

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching received interests:", error);

    logSecurityEvent(
      "VALIDATION_FAILED",
      {
        userId: req.url.includes("userId=")
          ? new URL(req.url).searchParams.get("userId")
          : "unknown",
        endpoint: "interests/received",
        method: "GET",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      req
    );

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }

    return errorResponse("Failed to fetch received interests", 500);
  }
}