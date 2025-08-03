import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { validateConversationId } from "@/lib/utils/messageValidation";

// Initialize Convex client
const convexClient = getConvexClient();

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Messages read POST auth failed", {
        scope: "messages.read",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { token, userId } = authCheck;

    const rateLimitResult = checkApiRateLimit(
      `mark_conversation_read_${userId}`,
      50,
      60000,
    );
    if (!rateLimitResult.allowed) {
      console.warn("Messages read POST rate limited", {
        scope: "messages.read",
        type: "rate_limit",
        correlationId,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Rate limit exceeded", correlationId },
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

    const { conversationId, userId: requestUserId } =
      (body as { conversationId?: string; userId?: string }) || {};

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing required field: conversationId", correlationId },
        { status: 400 }
      );
    }

    if (!validateConversationId(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversationId format", correlationId },
        { status: 400 }
      );
    }

    if (requestUserId && requestUserId !== userId) {
      return NextResponse.json(
        {
          error: "Cannot mark conversation as read for another user",
          correlationId,
        },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: "Database connection failed", correlationId },
        { status: 500 }
      );
    }
    try {
      // @ts-ignore legacy
      client.setAuth?.(token);
    } catch {}

    const userIds = conversationId.split("_");
    if (!userId || !userIds.includes(userId as string)) {
      return NextResponse.json(
        { error: "Unauthorized access to conversation", correlationId },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
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

    console.info("Messages read POST success", {
      scope: "messages.read",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Conversation marked as read",
        conversationId,
        userId,
        readAt: Date.now(),
        correlationId,
      },
      { status: 200 }
    );
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
    return NextResponse.json(
      { error: "Failed to mark conversation as read", correlationId },
      { status: 500 }
    );
  }
}
