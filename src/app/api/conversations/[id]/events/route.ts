import { NextRequest } from "next/server";
import { requireUserToken } from "@/app/api/_utils/auth";
import { eventBus } from "@/lib/eventBus";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify auth
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;

  const conversationId = params.id;
  if (!conversationId) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing conversationId" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      // Listen for events for this conversation
      eventBus.on(conversationId, send);

      // Heartbeat to keep the connection alive behind proxies
      const heartbeat = setInterval(() => {
        controller.enqueue(`:keep-alive\n\n`);
      }, 15000);

      // When the connection is closed
      return () => {
        clearInterval(heartbeat);
        eventBus.off(conversationId, send);
      };
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
