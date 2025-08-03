import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

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
      console.warn("Messages mark-read POST auth failed", {
        scope: "messages.mark_read",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { token, userId } = authCheck;

    const rateLimitResult = checkApiRateLimit(`mark_read_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      console.warn("Messages mark-read POST rate limited", {
        scope: "messages.mark_read",
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

    const { messageIds } =
      (body as { messageIds?: string[] }) || {};

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty messageIds array", correlationId },
        { status: 400 }
      );
    }

    if (messageIds.length > 100) {
      return NextResponse.json(
        {
          error: "Cannot mark more than 100 messages as read at once",
          correlationId,
        },
        { status: 400 }
      );
    }

    if (!messageIds.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "All messageIds must be non-empty strings", correlationId },
        { status: 400 }
      );
    }

    let client = convexClient || getConvexClient();
    if (!client) {
      console.error("Messages mark-read POST convex not configured", {
        scope: "messages.mark_read",
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

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    await client
      .mutation(api.messages.markConversationRead, {
        conversationId: messageIds[0]!,
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Messages mark-read POST mutation error", {
          scope: "messages.mark_read",
          type: "convex_mutation_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        throw e;
      });

    console.info("Messages mark-read POST success", {
      scope: "messages.mark_read",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      updatedCount: messageIds.length,
    });
    return NextResponse.json(
      {
        success: true,
        message: `Marked ${messageIds.length} messages as read`,
        messageIds,
        readAt: Date.now(),
        updatedCount: messageIds.length,
        correlationId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Messages mark-read POST unhandled error", {
      scope: "messages.mark_read",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to mark messages as read", correlationId },
      { status: 500 }
    );
  }
}
