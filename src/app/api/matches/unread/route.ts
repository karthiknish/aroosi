import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { requireSession } from "@/app/api/_utils/auth";

// Cookie-auth alignment: infer user from session; no bearer header parsing

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Cookie-only authentication
    const session = await requireSession(req);
    if ("errorResponse" in session) {
      const res = session.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { success: false, error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      return NextResponse.json(body, { status });
    }
    const { userId } = session;

    // Subscription-aware rate limiting for unread counts polling
    // Cookie-only: no token string available; pass empty string to satisfy types
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      req,
      "",
      String(userId),
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
