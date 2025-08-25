import { NextRequest } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { eventBus } from "@/lib/eventBus";
import { validateUserCanAccessConversation } from "@/lib/utils/matchValidation";
import { isValidConversationIdFormat } from "@/lib/utils/secureConversation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if ("errorResponse" in session) return session.errorResponse;
  const { userId } = session;

  const conversationId = req.nextUrl.pathname.split("/").slice(-2)[0];

  // Validate conversation ID format
  if (!conversationId || !isValidConversationIdFormat(conversationId)) {
    return new Response(JSON.stringify({ success: false, error: "Invalid conversationId format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate user can access this conversation (no bearer token; server-side check)
  try {
    const canAccess = await validateUserCanAccessConversation(String(userId), conversationId, null as any);
    if (!canAccess) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized access to conversation" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error validating conversation access:", error);
    return new Response(JSON.stringify({ success: false, error: "Access validation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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

      // Immediately notify client that stream is open so UI can mark delivered
      try {
        controller.enqueue(`event: open\n` + `data: {"type":"sse_open"}\n\n`);
      } catch {
        /* ignore */
      }

      heartbeat = setInterval(async () => {
        if (closed) return;
        try {
          // Update presence heartbeat for this user via local API
          try {
            const response = await fetch(`${req.nextUrl.origin}/api/presence`, {
              method: "POST",
              headers: {
                // Get auth from session - this should work since we have session from requireSession
                Cookie: req.headers.get("cookie") || "",
              },
            });
            if (!response.ok) {
              console.warn("Presence heartbeat failed:", response.status);
            }
          } catch (error) {
            console.warn("Presence heartbeat error:", error);
          }
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

      // Set user as offline when SSE connection is cancelled
      setTimeout(async () => {
        try {
          await fetch(`${req.nextUrl.origin}/api/presence`, {
            method: "POST",
            headers: {
              Cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({ status: "offline" }),
          });
        } catch (error) {
          console.warn("Failed to set offline status:", error);
        }
      }, 1000); // Small delay to avoid race conditions
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
