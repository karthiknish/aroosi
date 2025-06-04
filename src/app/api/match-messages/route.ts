import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

function getTokenFromRequest(req: NextRequest): {
  token: string | null;
  error?: string;
} {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return { token: null, error: "No authorization header" };
    const [type, token] = auth.split(" ");
    if (type !== "Bearer") return { token: null, error: "Invalid token type" };
    if (!token) return { token: null, error: "No token provided" };
    return { token };
  } catch (error) {
    return {
      token: null,
      error: error instanceof Error ? error.message : "Failed to process token",
    };
  }
}

// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: "Missing conversationId parameter" },
      { status: 400 }
    );
  }
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication failed", details: tokenError },
      { status: 401 }
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const result = await convex.query(api.messages.getMessages, {
      conversationId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch messages",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(req: NextRequest) {
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication failed", details: tokenError },
      { status: 401 }
    );
  }
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 400 }
    );
  }
  const { conversationId, fromUserId, toUserId, text } = body || {};
  if (!conversationId || !fromUserId || !toUserId || !text) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const result = await convex.mutation(api.messages.sendMessage, {
      conversationId,
      fromUserId: fromUserId as Id<"users">,
      toUserId: toUserId as Id<"users">,
      text,
    });
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication"));
    return NextResponse.json(
      {
        success: false,
        error: isAuthError ? "Authentication failed" : "Failed to send message",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: isAuthError ? 401 : 400 }
    );
  }
}
