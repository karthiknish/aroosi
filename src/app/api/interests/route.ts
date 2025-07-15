import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import {
  checkApiRateLimit,
  logSecurityEvent,
} from "@/lib/utils/securityHeaders";

type InterestAction = "send" | "remove";

interface InterestRequest {
  fromUserId: string;
  toUserId: string;
}

async function handleInterestAction(req: NextRequest, action: InterestAction) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId } = authCheck;

    // Rate limiting for interest actions
    const rateLimitResult = checkApiRateLimit(
      `interest_${action}_${userId}`,
      action === "send" ? 50 : 100, // 50 sends or 100 removes per hour
      60000
    );
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Parse request body
    let body: Partial<InterestRequest>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request body", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Missing or invalid body", 400);
    }

    // Validate required fields
    const { toUserId } = body as { toUserId?: string };
    if (!toUserId || typeof toUserId !== "string") {
      return errorResponse("Invalid or missing toUserId", 400);
    }

    // Derive Convex internal user id from the auth token (JWT user id)
    let convexClient: ReturnType<typeof getConvexClient>;
    let fromUserIdConvex: Id<"users">;

    {
      const convex = getConvexClient();
      if (!convex) return errorResponse("Convex client not configured", 500);
      convex.setAuth(token);

      let currentUserRecord;
      try {
        currentUserRecord = await convex.query(
          api.users.getCurrentUserWithProfile,
          {}
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isAuth =
          message.includes("Unauthenticated") || message.includes("token");
        return errorResponse(
          isAuth ? "Authentication failed" : "Failed to fetch current user",
          isAuth ? 401 : 400
        );
      }

      if (!currentUserRecord) {
        return errorResponse("User not found", 404);
      }

      fromUserIdConvex = currentUserRecord._id as Id<"users">;

      // Move convex client into outer scope
      convexClient = convex;
    }

    // Prevent self-interest (users cannot send interest to themselves)
    if (fromUserIdConvex === (toUserId as Id<"users">)) {
      return errorResponse("Cannot send interest to yourself", 400);
    }

    const convex = convexClient;

    // Log interest action for monitoring
    console.log(`User ${userId} ${action} interest to ${toUserId}`);

    try {
      const result = await convex.mutation(
        action === "send"
          ? api.interests.sendInterest
          : api.interests.removeInterest,
        {
          fromUserId: fromUserIdConvex,
          toUserId: toUserId as Id<"users">,
        }
      );

      // Validate result – Convex v0.16 may return the inserted id string
      // instead of an object. Accept either `{ success: true, interestId }`
      // or a bare string id.
      if (
        !result ||
        (typeof result !== "object" && typeof result !== "string")
      ) {
        console.error(`Invalid ${action} interest result:`, result);
        return errorResponse(`Failed to ${action} interest`, 500);
      }

      // Normalise to a consistent response shape so the front-end can rely on it
      const normalised =
        typeof result === "string"
          ? { success: true, interestId: result }
          : result;

      // Check if Convex returned an error (e.g., rate limiting)
      if ("success" in normalised && normalised.success === false) {
        const errorMsg =
          "error" in normalised && typeof normalised.error === "string"
            ? normalised.error
            : `Failed to ${action} interest`;
        return errorResponse(errorMsg, 429); // Use 429 for rate limiting
      }

      console.log(
        `Interest ${action} successful: ${fromUserIdConvex} -> ${toUserId}`
      );

      // Wrap normalised result in a standard envelope so the frontend has a consistent shape.
      return successResponse({ result: normalised });
    } catch (convexErr) {
      console.error(`Error in interest ${action}:`, convexErr);

      // Log security event for monitoring
      logSecurityEvent(
        "VALIDATION_FAILED",
        {
          userId,
          endpoint: "interests",
          action,
          error:
            convexErr instanceof Error ? convexErr.message : "Unknown error",
        },
        req
      );

      const error = convexErr as Error;
      const isAuthError =
        error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication");

      if (isAuthError) {
        return errorResponse("Authentication failed", 401);
      }

      // Don't expose internal errors in production
      const errorMessage =
        process.env.NODE_ENV === "development"
          ? error.message
          : `Failed to ${action} interest`;

      return errorResponse(errorMessage, 400);
    }
  } catch (error) {
    console.error(`Unexpected error in interest ${error}:`, error);

    return errorResponse("Internal server error", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { token, userId: authenticatedUserId } = authCheck;

    // Rate limiting for interest queries
    const rateLimitResult = checkApiRateLimit(
      `interest_get_${authenticatedUserId}`,
      100,
      60000,
    ); // 100 requests per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    // Get optional userId from query string; default to current authenticated user
    const { searchParams } = new URL(req.url);

    // Determine target user ID (always current user)
    const userIdParam = searchParams.get("userId");

    // Initialize Convex client (creates 'convex')

    const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
    convex.setAuth(token);

    let currentUserRecord;
    try {
      currentUserRecord = await convex.query(
        api.users.getCurrentUserWithProfile,
        {},
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isAuth =
        message.includes("Unauthenticated") || message.includes("token");
      return errorResponse(
        isAuth ? "Authentication failed" : "Failed to fetch current user",
        isAuth ? 401 : 400,
      );
    }

    if (!currentUserRecord) {
      return errorResponse("User not found", 404);
    }

    const currentUserId = currentUserRecord._id as Id<"users">;

    if (userIdParam && userIdParam !== (currentUserId as unknown as string)) {
      logSecurityEvent(
        "UNAUTHORIZED_ACCESS",
        {
          userId: authenticatedUserId,
          attemptedUserId: userIdParam,
          action: "get_interests",
        },
        req,
      );
      return errorResponse(
        "Unauthorized: can only view your own interests",
        403,
      );
    }

    const userId = currentUserId;

    // Log interest query for monitoring
    console.log(`User ${authenticatedUserId} querying sent interests`);

    const result = await convex.query(api.interests.getSentInterests, {
      userId: userId as Id<"users">,
    });

    // Validate result
    if (!result || (typeof result !== "object" && !Array.isArray(result))) {
      console.error("Invalid sent interests result:", result);
      return errorResponse("Failed to fetch interests", 500);
    }

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching sent interests:", error);

    // Log security event for monitoring
    logSecurityEvent(
      "VALIDATION_FAILED",
      {
        userId: req.url.includes("userId=")
          ? new URL(req.url).searchParams.get("userId")
          : "unknown",
        endpoint: "interests",
        method: "GET",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      req,
    );

    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return errorResponse("Authentication failed", 401);
    }

    return errorResponse("Failed to fetch interests", 500);
  }
}

export async function POST(req: NextRequest) {
  return handleInterestAction(req, "send");
}

export async function DELETE(req: NextRequest) {
  return handleInterestAction(req, "remove");
}
