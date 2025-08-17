import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { markMessagesRead } from "@/lib/messages/firebaseMessages";

export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const userId = authUser.id;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body", 400, { correlationId });
    }
    const { conversationId } = (body as { conversationId?: string }) || {};
    if (!conversationId) {
      return errorResponse("conversationId required", 400, { correlationId });
    }
    const users = conversationId.split("_");
    if (!users.includes(userId)) {
      return errorResponse("Unauthorized", 403, { correlationId });
    }
    const { updated, readAt } = await markMessagesRead(conversationId, userId);
    return successResponse(
      { updated, readAt, correlationId, durationMs: Date.now() - startedAt },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message || "Failed to mark messages read", 500, {
      correlationId,
    });
  }
});
