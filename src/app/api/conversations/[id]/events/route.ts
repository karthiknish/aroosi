import { NextRequest } from "next/server";
import { requireUserToken } from "@/app/api/_utils/auth";
import { eventBus } from "@/lib/eventBus";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Verify auth
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;

  const conversationId = req.nextUrl.pathname.split("/").slice(-2)[0];
  if (!conversationId) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing conversationId" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let heartbeat: NodeJS.Timeout;
  let send: (data: unknown) => void;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        clearInterval(heartbeat);
        eventBus.off(conversationId, send);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send = (data: unknown) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          cleanup();
        }
      };
      eventBus.on(conversationId, send);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(`:keep-alive\n\n`);
        } catch {
          cleanup();
        }
      }, 15000);
    },
    cancel() {
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
