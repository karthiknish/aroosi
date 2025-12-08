export const config = {
  runtime: "edge",
};

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export async function GET(request: Request) {
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  // Create WebSocket pair using Edge Runtime
  const pair = new (global as any).WebSocketPair();
  const [client, server] = pair;

  // Accept the WebSocket connection
  server.accept();

  // Handle WebSocket events - fully compatible with mobile RealtimeMessagingService
  server.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as WebSocketMessage;

      // Handle different message types - fully compatible with mobile format
      switch (data.type) {
        case "join_conversation":
          server.send(
            JSON.stringify({
              type: "joined",
              conversationId: data.conversationId,
              userId: data.userId,
              timestamp: Date.now(),
            })
          );
          break;

        case "message":
          server.send(
            JSON.stringify({
              type: "message",
              id: `msg_${Date.now()}`,
              conversationId: data.conversationId,
              fromUserId: data.fromUserId || data.userId,
              toUserId: data.toUserId || "all",
              messageType: "text",
              content: data.message || data.content,
              timestamp: Date.now(),
            })
          );
          break;

        case "typing":
          server.send(
            JSON.stringify({
              type: "typing",
              conversationId: data.conversationId,
              userId: data.userId,
              isTyping: data.isTyping,
              timestamp: Date.now(),
            })
          );
          break;

        case "delivery_receipt":
          server.send(
            JSON.stringify({
              type: "delivery_receipt",
              messageId: data.messageId,
              conversationId: data.conversationId,
              userId: data.userId,
              status: data.status,
              timestamp: Date.now(),
            })
          );
          break;

        case "read_receipt":
          server.send(
            JSON.stringify({
              type: "read_receipt",
              messageId: data.messageId,
              conversationId: data.conversationId,
              userId: data.userId,
              status: "read",
              timestamp: Date.now(),
            })
          );
          break;

        case "ping":
          server.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          server.send(
            JSON.stringify({
              type: "error",
              message: "Unknown message type",
            })
          );
      }
    } catch (error) {
      server.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  server.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });

  server.addEventListener("error", (error: Event) => {
    console.error("WebSocket error:", error);
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as any);
}
