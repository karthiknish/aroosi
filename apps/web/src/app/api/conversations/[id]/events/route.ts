import { eventBus } from "@/lib/eventBus";
import { validateUserCanAccessConversation } from "@/lib/utils/matchValidation";
import { isValidConversationIdFormat } from "@/lib/utils/secureConversation";
import {
  createAuthenticatedHandler,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";

export const runtime = "nodejs";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const { request } = ctx;
    const userId = ctx.user!.id;

    const conversationId = request.nextUrl.pathname.split("/").slice(-2)[0];

    // Validate conversation ID format
    if (!conversationId || !isValidConversationIdFormat(conversationId)) {
      return errorResponse("Invalid conversationId format", 400, { correlationId: ctx.correlationId });
    }

    // Validate user can access this conversation
    try {
      const canAccess = await validateUserCanAccessConversation(String(userId), conversationId, null as any);
      if (!canAccess) {
        return errorResponse("Unauthorized access to conversation", 403, { correlationId: ctx.correlationId });
      }
    } catch (error) {
      console.error("Error validating conversation access:", error);
      return errorResponse("Access validation failed", 500, { correlationId: ctx.correlationId });
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
              const response = await fetch(`${request.nextUrl.origin}/api/presence`, {
                method: "POST",
                headers: {
                  Cookie: request.headers.get("cookie") || "",
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
            await fetch(`${request.nextUrl.origin}/api/presence`, {
              method: "POST",
              headers: {
                Cookie: request.headers.get("cookie") || "",
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
  },
  {
    rateLimit: { identifier: "sse_events", maxRequests: 10 }
  }
);
