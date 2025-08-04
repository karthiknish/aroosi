import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    // Rate limit typing updates (cheap but potentially noisy)
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "" as unknown as string, // cookie-only: no token provided
      userId || "unknown",
      "typing_update",
      60000
    );
    if (!rate.allowed) {
      return errorResponse(
        rate.error || "Rate limit exceeded",
        429
      );
    }

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    // Cookie-only: do not set bearer on client

    const { conversationId, action } = await request.json();
    if (!conversationId || !action || !["start", "stop"].includes(action)) {
      return errorResponse("Invalid request parameters", 400);
    }

    // Update typing indicator in Convex
    const indicatorId = await client.mutation(api.typingIndicators.updateTypingStatus, {
      conversationId,
      userId: userId as Id<"users">,
      isTyping: action === "start",
    });

    // Emit SSE typing event
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: action === "start" ? "typing_start" : "typing_stop",
        conversationId,
        userId,
        at: Date.now(),
      });
    } catch (eventError) {
      console.warn("Typing SSE emit failed", {
        scope: "typing.update",
        correlationId,
        message: eventError instanceof Error ? eventError.message : String(eventError),
      });
    }

    return successResponse({
      message: `Typing indicator ${action}ed`,
      indicatorId,
      conversationId,
      userId,
      action,
      isTyping: action === "start",
      correlationId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Error handling typing indicator:", error);
    return errorResponse("Failed to update typing indicator", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;

    let client = getConvexClient();
    if (!client) client = getConvexClient();
    if (!client) return errorResponse("Service temporarily unavailable", 503);
    // Cookie-only: do not set bearer on client

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return errorResponse("Missing conversationId", 400);

    // Fetch typing indicators from Convex
    const typingUsers = await client.query(api.typingIndicators.getTypingUsers, {
      conversationId,
    });

    return successResponse({
      conversationId,
      typingUsers,
    });
  } catch (error) {
    console.error("Error fetching typing indicators:", error);
    return errorResponse("Failed to fetch typing indicators", 500);
  }
}
