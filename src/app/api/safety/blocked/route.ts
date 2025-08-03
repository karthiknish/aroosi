import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import type { Id } from "@convex/_generated/dataModel";

// NOTE: Explicit JSON helper to avoid accidental 404/redirect behavior from wrappers.
const json = (data: unknown, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Initialize Convex client (best-effort)
const convexClient = getConvexClient();

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Authentication (app-layer auth)
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) {
      // Normalize helper response to plain JSON
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { success: false, error: "Authentication failed", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Safety blocked auth failed", {
        scope: "safety.blocked",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return json(body, status);
    }
    const { userId } = authCheck;

    // Rate limiting for fetching blocked users
    const rateLimitResult = checkApiRateLimit(`safety_blocked_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      console.warn("Safety blocked rate limit exceeded", {
        scope: "safety.blocked",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return json({ success: false, error: "Rate limit exceeded", correlationId }, 429);
    }

    const client = convexClient ?? getConvexClient();
    if (!client) {
      console.error("Safety blocked convex not configured", {
        scope: "safety.blocked",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return json({ success: false, error: "Database connection failed", correlationId }, 500);
    }

    // Resolve Convex identity via server-side function (no client-side JWT to Convex)
    const currentUser = (await client
      .query(api.users.getCurrentUserWithProfile, {})
      .catch((e: unknown) => {
        console.error("Safety blocked identity error", {
          scope: "safety.blocked",
          type: "identity_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      })) as { _id: Id<"users"> } | null;

    if (!currentUser) {
      console.warn("Safety blocked user not found", {
        scope: "safety.blocked",
        type: "user_not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return json({ success: false, error: "User record not found", correlationId }, 404);
    }

    // Get blocked users by explicit user id
    const blockedUsers = await client
      .query(api.safety.getBlockedUsers, {
        blockerUserId: currentUser._id,
      })
      .catch((e: unknown) => {
        console.error("Safety blocked query error", {
          scope: "safety.blocked",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (blockedUsers == null) {
      return json({ success: false, error: "Failed to fetch blocked users", correlationId }, 500);
    }

    const response = json(
      { success: true, blockedUsers: blockedUsers || [], correlationId },
      200
    );

    console.info("Safety blocked success", {
      scope: "safety.blocked",
      type: "success",
      count: Array.isArray(blockedUsers) ? blockedUsers.length : 0,
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Safety blocked unhandled error", {
      scope: "safety.blocked",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return json({ success: false, error: "Failed to fetch blocked users", details: message, correlationId }, 500);
  }
}