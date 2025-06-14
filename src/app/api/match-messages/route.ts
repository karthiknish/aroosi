import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";

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
    return errorResponse("Missing conversationId parameter", 400);
  }
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return errorResponse("Authentication failed", 401, { details: tokenError });
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const result = await convex.query(api.messages.getMessages, {
      conversationId,
    });
    return successResponse(result);
  } catch (error) {
    const details =
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined;
    return errorResponse("Failed to fetch messages", 500, details);
  }
}

// POST: Send a message
export async function POST(req: NextRequest) {
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return errorResponse("Authentication failed", 401, { details: tokenError });
  }
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return errorResponse("Invalid request body", 400, {
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
  const { conversationId, fromUserId, toUserId, text } = body || {};
  if (!conversationId || !fromUserId || !toUserId || !text) {
    return errorResponse("Missing required fields", 400);
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
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
    return successResponse(result);
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message.includes("Unauthenticated") ||
        error.message.includes("token") ||
        error.message.includes("authentication"));
    const details =
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined;
    return errorResponse(
      isAuthError ? "Authentication failed" : "Failed to send message",
      isAuthError ? 401 : 400,
      details
    );
  }
}
