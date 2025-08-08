import { NextRequest, NextResponse } from "next/server";
import { convexMutationWithAuth } from "@/lib/convexServer";
import { api } from "@convex/_generated/api";
import { requireSession } from "@/app/api/_utils/auth";

import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      return session.errorResponse;
    }
    const { userId } = session;

    const rateLimitResult = checkApiRateLimit(`mark_read_${userId}`, 50, 60000);
    if (!rateLimitResult.allowed) {
      if (process.env.NODE_ENV !== "production")
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

    const { messageIds } = (body as { messageIds?: string[] }) || {};

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

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found", correlationId },
        { status: 401 }
      );
    }

    await convexMutationWithAuth(request, api.messages.markConversationRead, {
      conversationId: messageIds[0]!,
      userId: userId as any,
    } as any).catch((e: unknown) => {
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

    if (process.env.NODE_ENV !== "production")
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
    if (process.env.NODE_ENV !== "production")
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
