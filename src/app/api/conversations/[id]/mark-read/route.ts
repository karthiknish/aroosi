import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireSession } from "@/app/api/_utils/auth";
import { validateConversationId } from "@/lib/utils/messageValidation";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      const res = session.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Conversation mark-read auth failed", {
        scope: "conversations.mark_read",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { userId } = session;

    // Rate limit read operations with subscription-aware limiter
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      null as any, // no bearer token in cookie-only model
      String(userId),
      "message_read",
      60000
    );
    if (!rate.allowed) {
      console.warn("Conversation mark-read rate limited", {
        scope: "conversations.mark_read",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
        plan: rate.plan,
        limit: rate.limit,
        remaining: rate.remaining,
      });
      return NextResponse.json(
        {
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
      console.error("Conversation mark-read convex not configured", {
        scope: "conversations.mark_read",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Convex client not configured", correlationId },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const conversationId = url.pathname.split("/").slice(-2, -1)[0];
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId", correlationId },
        { status: 400 }
      );
    }
    if (!validateConversationId(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversationId format", correlationId },
        { status: 400 }
      );
    }

    // Ensure the user is part of the conversation (legacy format check)
    const parts = conversationId.split("_");
    if (!parts.includes(String(userId))) {
      return NextResponse.json(
        { error: "Unauthorized access to conversation", correlationId },
        { status: 403 }
      );
    }

    const readAt = Date.now();
    const result = await convex
      .mutation(api.messages.markConversationRead, {
        conversationId,
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Conversation mark-read mutation error", {
          scope: "conversations.mark_read",
          type: "convex_mutation_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to mark conversation as read", correlationId },
        { status: 500 }
      );
    }

    // Publish SSE read event for subscribers
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_read",
        conversationId,
        userId: String(userId),
        readAt,
      });
    } catch (eventError) {
      console.warn("Conversation mark-read broadcast warn", {
        scope: "conversations.mark_read",
        type: "broadcast_warn",
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
        correlationId,
      });
    }

    console.info("Conversation mark-read success", {
      scope: "conversations.mark_read",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: true, conversationId, userId, readAt, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Conversation mark-read unhandled error", {
      scope: "conversations.mark_read",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to mark conversation as read", correlationId },
      { status: 500 }
    );
  }
}
