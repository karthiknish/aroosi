import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireSession } from "@/app/api/_utils/auth";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import {
  validateMessagePayload,
  validateConversationId,
  validateUserCanMessage,
} from "@/lib/utils/messageValidation";

// GET: Fetch messages for a conversation
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      return NextResponse.json(
        { error: "Unauthorized", correlationId },
        { status: 401 }
      );
    }
    const { userId } = session as unknown as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    // Use subscription-aware rate limiter (read/list window)
    // Cookie-only auth: no token string is available; pass an empty string to satisfy types
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "",
      userId,
      "message_list",
      60000
    );
    if (!rate.allowed) {
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");

    if (!conversationId || !validateConversationId(conversationId)) {
      return NextResponse.json(
        { error: "Invalid or missing conversationId parameter", correlationId },
        { status: 400 }
      );
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          { error: "Invalid limit parameter (must be 1-100)", correlationId },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    let before: number | undefined;
    if (beforeParam) {
      const parsedBefore = parseInt(beforeParam, 10);
      if (isNaN(parsedBefore) || parsedBefore < 0) {
        return NextResponse.json(
          { error: "Invalid before parameter", correlationId },
          { status: 400 }
        );
      }
      before = parsedBefore;
    }


    const userIds = conversationId.split("_");
    if (!userIds.includes(userId)) {
      return NextResponse.json(
        { error: "Unauthorized access to conversation", correlationId },
        { status: 403 }
      );
    }

    const result = await fetchQuery(api.messages.getMessages, {
      conversationId,
      limit,
      before,
    } as any).catch((e: unknown) => {
      console.error("Messages GET query error", {
        scope: "messages.get",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch messages", correlationId },
        { status: 500 }
      );
    }

    console.info("Messages GET success", {
      scope: "messages.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(result) ? result.length : undefined,
    });
    return NextResponse.json(
      { success: true, messages: result, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Messages GET unhandled error", {
      scope: "messages.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to fetch messages", correlationId },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      return NextResponse.json(
        { error: "Unauthorized", correlationId },
        { status: 401 }
      );
    }
    const { userId } = session as unknown as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    // subscription-aware limiter for message send
    // Cookie-only auth: no token string is available; pass an empty string to satisfy types
    const rate = await subscriptionRateLimiter.checkSubscriptionRateLimit(
      request,
      "",
      userId,
      "message_sent",
      60000
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error:
            rate.error ||
            "Rate limit exceeded. Please wait before sending more messages.",
          correlationId,
          plan: rate.plan,
          limit: rate.limit,
          remaining: rate.remaining,
          resetTime: new Date(rate.resetTime).toISOString(),
        },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", correlationId },
        { status: 400 }
      );
    }

    const { conversationId, fromUserId, toUserId, text } =
      (body as {
        conversationId?: string;
        fromUserId?: string;
        toUserId?: string;
        text?: string;
      }) || {};

    if (!conversationId || !fromUserId || !toUserId || !text) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: conversationId, fromUserId, toUserId, text",
          correlationId,
        },
        { status: 400 }
      );
    }

    if (fromUserId !== userId) {
      return NextResponse.json(
        { error: "Cannot send messages as another user", correlationId },
        { status: 403 }
      );
    }

    const validation = validateMessagePayload({
      conversationId,
      fromUserId,
      toUserId,
      text,
    });
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error || "Invalid message payload",
          correlationId,
        },
        { status: 400 }
      );
    }


    const canMessage = await validateUserCanMessage(fromUserId, toUserId);
    if (!canMessage) {
      return NextResponse.json(
        { error: "Users are not authorized to message each other", correlationId },
        { status: 403 }
      );
    }

    const blockStatus = await fetchQuery(api.safety.getBlockStatus, {
      blockerUserId: fromUserId as Id<"users">,
      blockedUserId: toUserId as Id<"users">,
    } as any).catch((e: unknown) => {
      console.error("Messages POST getBlockStatus error", {
        scope: "messages.post",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

    if (blockStatus) {
      return NextResponse.json(
        { error: "Cannot send message to this user", correlationId },
        { status: 403 }
      );
    }

    const sanitizedText = validation.sanitizedText || text;

    const result = await fetchMutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text: sanitizedText,
    } as any).catch((e: unknown) => {
      console.error("Messages POST sendMessage error", {
        scope: "messages.post",
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
        { error: "Failed to send message", correlationId },
        { status: 500 }
      );
    }

    // Publish normalized SSE event payload for message_sent
    try {
      const { eventBus } = await import("@/lib/eventBus");
      eventBus.emit(conversationId, {
        type: "message_sent",
        message: result,
      });
    } catch (eventError) {
      console.warn("Failed to broadcast message", {
        scope: "messages.post",
        type: "broadcast_warn",
        message:
          eventError instanceof Error ? eventError.message : String(eventError),
        correlationId,
        durationMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json(
      { success: true, message: result, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Messages POST unhandled error", {
      scope: "messages.post",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to send message", correlationId },
      { status: 500 }
    );
  }
}
