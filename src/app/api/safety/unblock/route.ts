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
  const startedAt = Date.now();
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    // Centralized cookie session (auto-refresh + forwarding)
    const { getSessionFromRequest } = await import("@/app/api/_utils/authSession");
    const session = await getSessionFromRequest(request);
    if (!session.ok) {
      console.warn("Safety blocked auth failed", {
        scope: "safety.blocked",
        type: "auth_failed",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return session.errorResponse!;
    }
    const userId = session.userId!;

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

    // Build response and forward any refreshed cookies
    const res = successResponse({
      message: "User unblocked successfully",
      correlationId,
    });
    for (const c of session.setCookiesToForward) {
      res.headers.append("Set-Cookie", c);
    }
    console.info("Safety unblock success", {
      scope: "safety.unblock",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return res;

  } catch (error) {
    console.error("Error in safety unblock API:", {
      scope: "safety.unblock",
      type: "unhandled_error",
      message: error instanceof Error ? error.message : String(error),
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to unblock user", 500);
  }
}