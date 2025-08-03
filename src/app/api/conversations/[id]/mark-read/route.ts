import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireUserToken } from "@/app/api/_utils/auth";

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
      console.warn("Conversation mark-read auth failed", {
        scope: "conversations.mark_read",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { token, userId } = authCheck;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in token", correlationId },
        { status: 401 }
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
    try {
      // @ts-ignore legacy
      convex.setAuth?.(token);
    } catch {}

    const url = new URL(request.url);
    const conversationId = url.pathname.split("/").slice(-2, -1)[0];
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId", correlationId },
        { status: 400 }
      );
    }

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

    console.info("Conversation mark-read success", {
      scope: "conversations.mark_read",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: true, result, correlationId },
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
