import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const limitParam = searchParams.get("limit");
  const beforeParam = searchParams.get("before");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const before = beforeParam ? parseInt(beforeParam, 10) : undefined;
  if (!conversationId) {
    return errorResponse("Missing conversationId parameter", 400);
  }
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return errorResponse("Server configuration error", 500);
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const result = await convex.query(api.messages.getMessages, {
      conversationId,
      limit,
      before,
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
  const authCheckPost = requireUserToken(req);
  if ("errorResponse" in authCheckPost) return authCheckPost.errorResponse;
  const { token } = authCheckPost;
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
    // Broadcast to SSE subscribers
    const { eventBus } = await import("@/lib/eventBus");
    eventBus.emit(conversationId, result);
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
