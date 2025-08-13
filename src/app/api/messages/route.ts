import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId", correlationId },
        { status: 400 }
      );
    }

    let limit: number | undefined;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
        return NextResponse.json(
          { error: "Invalid limit parameter (1-100)", correlationId },
          { status: 400 }
        );
      }
      limit = parsed;
    }

    let before: number | undefined;
    if (beforeParam) {
      const parsed = parseInt(beforeParam, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "Invalid before parameter", correlationId },
          { status: 400 }
        );
      }
      before = parsed;
    }

    const messages = await convexQueryWithAuth(request, api.messages.getMessages, {
      conversationId,
      limit,
      before,
    } as any).catch(() => null);

    if (!messages) {
      return NextResponse.json(
        { error: "Failed to fetch messages", correlationId },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: messages,
        messages,
        correlationId,
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Messages GET error", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  } finally {
    if (process.env.NODE_ENV !== "production") {
      const elapsedMs = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log("Messages GET timing", { correlationId, elapsedMs });
    }
  }
}


