import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

// Cookie-auth alignment: infer user from session; no bearer header parsing

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Derive current user from session cookie using the same helper as other APIs
    const { requireUserToken } = await import("@/app/api/_utils/auth");
    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { success: false, error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      return NextResponse.json(body, { status });
    }
    const { token, userId } = authCheck as { token: string; userId: string };

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
