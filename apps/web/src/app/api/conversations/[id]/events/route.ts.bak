import { NextRequest } from "next/server";
import { requireUserToken, extractUserIdFromToken } from "@/app/api/_utils/auth";
import { eventBus } from "@/lib/eventBus";
import { validateUserCanAccessConversation } from "@/lib/utils/matchValidation";
import { isValidConversationIdFormat } from "@/lib/utils/secureConversation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Verify auth
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;

  const conversationId = req.nextUrl.pathname.split("/").slice(-2)[0];
  
  // Validate conversation ID format
  if (!conversationId || !isValidConversationIdFormat(conversationId)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid conversationId format" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Extract user ID from token
  const userId = extractUserIdFromToken(token);
  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid authentication token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate user can access this conversation
  try {
    const canAccess = await validateUserCanAccessConversation(userId, conversationId, token);
    if (!canAccess) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized access to conversation" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error('Error validating conversation access:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Access validation failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let heartbeat: NodeJS.Timeout;
  let send: (data: unknown) => void;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        eventBus.off(conversationId, send);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          cleanup();
        }
      };
      eventBus.on(conversationId, send);

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(`:keep-alive\n\n`);
        } catch {
          cleanup();
        }
      }, 15000);
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
      eventBus.off(conversationId, send);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
