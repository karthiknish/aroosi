import { NextRequest } from "next/server";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { listConversationMessages } from "@/lib/messages/firebaseMessages";

export const GET = withFirebaseAuth(async (_user, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const limitParam = searchParams.get("limit");
  const beforeParam = searchParams.get("before");

  if (!conversationId) {
    return errorResponse("Missing conversationId", 400, { correlationId });
  }

  let limit: number | undefined;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
      return errorResponse("Invalid limit parameter (1-100)", 400, {
        correlationId,
      });
    }
    limit = parsed;
  }

  let before: number | undefined;
  if (beforeParam) {
    const parsed = parseInt(beforeParam, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return errorResponse("Invalid before parameter", 400, { correlationId });
    }
    before = parsed;
  }

  try {
    const messages = await listConversationMessages(
      conversationId,
      limit,
      before
    );
    return successResponse({ messages, correlationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(msg || "Failed to fetch messages", 500, {
      correlationId,
    });
  }
});
