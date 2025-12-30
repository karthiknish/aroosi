import { validateUserCanAccessConversation } from "@/lib/utils/matchValidation";
import { isValidConversationIdFormat } from "@/lib/utils/secureConversation";
import {
  createAuthenticatedHandler,
  errorResponse,
  ApiContext,
} from "@/lib/api/handler";
import { fetchConversationEvents } from "@/lib/realtime/conversationEvents";

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

    let closed = false;
    let poller: NodeJS.Timeout;
    let heartbeat: NodeJS.Timeout;
    // Mimic the previous in-memory EventEmitter behavior: only stream new events.
    // Use an inclusive cursor + per-timestamp de-dupe to avoid missing events
    // created within the same millisecond.
    let lastSeenCreatedAt = Date.now();
    let sentIdsAtLastSeen = new Set<string>();

    const stream = new ReadableStream({
      start(controller) {
        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          clearInterval(poller);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        };

        // Immediately notify client that stream is open
        try {
          controller.enqueue(`event: open\n` + `data: {"type":"sse_open"}\n\n`);
        } catch {
          /* ignore */
        }

        // Poll Firestore-backed event stream (multi-instance safe)
        poller = setInterval(async () => {
          if (closed) return;
          try {
            const events = await fetchConversationEvents({
              conversationId,
              since: lastSeenCreatedAt,
              sinceInclusive: true,
              limit: 50,
            });
            for (const ev of events) {
              if (closed) return;
              const createdAt = ev.createdAt || 0;
              if (createdAt < lastSeenCreatedAt) continue;

              if (createdAt > lastSeenCreatedAt) {
                lastSeenCreatedAt = createdAt;
                sentIdsAtLastSeen = new Set<string>();
              }

              if (ev.id && sentIdsAtLastSeen.has(ev.id)) continue;
              if (ev.id) sentIdsAtLastSeen.add(ev.id);
              controller.enqueue(`data: ${JSON.stringify(ev)}\n\n`);
            }
          } catch {
            // If polling fails, keep the connection alive; client will reconnect if needed
          }
        }, 1000);

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
        clearInterval(poller);
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
