import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { fetchMutation } from "convex/nextjs";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";
import { validateConversationId } from "@/lib/utils/messageValidation";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let message = "Unauthorized";
      try {
        const txt = await res.text();
        const parsed = txt ? JSON.parse(txt) : undefined;
        message = (parsed?.error as string) || message;
      } catch {}
      console.warn("Messages read POST auth failed", {
        scope: "messages.read",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse(message, status, { correlationId });
    }
    const { userId } = authCheck;

    // Use subscription-aware rate limiter for consistency
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token string
      userId || "unknown",
      "message_read",
      60000
    );
    if (!rate.allowed) {
      console.warn("Messages read POST rate limited", {
        scope: "messages.read",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
        plan: rate.plan,
        limit: rate.limit,
        remaining: rate.remaining,
      });
      return errorResponse(rate.error || "Rate limit exceeded", 429, {
        correlationId,
        plan: rate.plan,
        limit: rate.limit,
        remaining: rate.remaining,
        resetTime: new Date(rate.resetTime).toISOString(),
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", 400, { correlationId });
    }

    const { conversationId, userId: requestUserId } =
      (body as { conversationId?: string; userId?: string }) || {};

    if (!conversationId) {
      return errorResponse("Missing required field: conversationId", 400, { correlationId });
    }

    if (!validateConversationId(conversationId)) {
      return errorResponse("Invalid conversationId format", 400, { correlationId });
    }

    if (requestUserId && requestUserId !== userId) {
      return errorResponse("Cannot mark conversation as read for another user", 403, { correlationId });
    }

    let client = convexClient || getConvexClient();
    if (!client) {
      console.error("Messages read POST convex not configured", {
        scope: "messages.read",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return errorResponse("Database connection failed", 500, { correlationId });
    }
    try {
      // cookie-only: do not set auth token on client
      // client.setAuth?.(undefined as unknown as string);
    } catch {}

    const userIds = conversationId.split("_");
    if (!userId || !userIds.includes(userId as string)) {
      return errorResponse("Unauthorized access to conversation", 403, { correlationId });
    }

    await client
      .mutation(api.messages.markConversationRead, {
        conversationId,
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Messages read POST mutation error", {
          scope: "messages.read",
          type: "convex_mutation_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        throw e;
      });

    // Publish SSE event for read receipts
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_read",
        conversationId,
        userId,
        readAt: Date.now(),
      });
    } catch (eventError) {
      console.warn("Messages read POST broadcast warn", {
        scope: "messages.read",
        type: "broadcast_warn",
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
        correlationId,
      });
    }

    console.info("Messages read POST success", {
      scope: "messages.read",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return successResponse({
      message: "Conversation marked as read",
      conversationId,
      userId,
      readAt: Date.now(),
      correlationId,
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Messages read POST unhandled error", {
      scope: "messages.read",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("Failed to mark conversation as read", 500, { correlationId });
  }
}
