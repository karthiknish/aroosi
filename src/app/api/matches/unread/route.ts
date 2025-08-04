import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

// Extract bearer token from header
function getToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [t, token] = auth.split(" ");
  if (t !== "Bearer") return null;
  return token;
}

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const token = getToken(req);

    if (!userId) {
      console.warn("Matches unread GET missing userId", {
        scope: "matches.unread",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Missing userId", correlationId },
        { status: 400 }
      );
    }

    if (!token) {
      console.warn("Matches unread GET auth failed", {
        scope: "matches.unread",
        type: "auth_failed",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Unauthorized", correlationId },
        { status: 401 }
      );
    }

    // Subscription-aware rate limiting for unread counts polling
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      req,
      token,
      userId,
      "unread_counts",
      60000
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rate.error || "Rate limit exceeded",
          correlationId,
          plan: rate.plan,
          limit: rate.limit,
          remaining: rate.remaining,
          resetTime: new Date(rate.resetTime).toISOString(),
        },
        { status: 429 }
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      console.error("Matches unread GET convex not configured", {
        scope: "matches.unread",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Convex client not configured", correlationId },
        { status: 500 }
      );
    }
    try {
      // @ts-ignore legacy
      convex.setAuth?.(token);
    } catch {}

    const counts = await convex
      .query(api.messages.getUnreadCountsForUser, {
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Matches unread GET query error", {
          scope: "matches.unread",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!counts) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch unread counts", correlationId },
        { status: 500 }
      );
    }

    console.info("Matches unread GET success", {
      scope: "matches.unread",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true, counts, correlationId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Matches unread GET unhandled error", {
      scope: "matches.unread",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: false, error: "Failed", correlationId },
      { status: 500 }
    );
  }
}
