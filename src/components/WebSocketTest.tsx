import React, { useState, useEffect } from "react";
import { WEBSOCKET_CONFIG } from "../lib/websocket/config";

interface WebSocketTestProps {
  userId: string;
  conversationId: string;
}

export const WebSocketTest: React.FC<WebSocketTestProps> = ({
  userId,
  conversationId,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(WEBSOCKET_CONFIG.ENDPOINT);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Join conversation
      websocket.send(
        JSON.stringify({
          type: "join",
          conversationId,
          userId,
        })
      );
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, `Received: ${JSON.stringify(data)}`]);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [...prev, `Error: ${JSON.stringify(error)}`]);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [userId, conversationId]);

  const sendMessage = () => {
    if (ws && isConnected && inputMessage.trim()) {
      ws.send(
        JSON.stringify({
          type: "message",
          message: inputMessage,
          senderId: userId,
          conversationId,
        })
      );
      setMessages((prev) => [...prev, `Sent: ${inputMessage}`]);
      setInputMessage("");
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (ws && isConnected) {
      ws.send(
        JSON.stringify({
          type: "typing",
          userId,
          conversationId,
          isTyping,
        })
      );
      setTyping(isTyping);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">WebSocket Test</h3>

      <div className="mb-2">
        <span
          className={`px-2 py-1 rounded text-sm ${isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onFocus={() => sendTyping(true)}
          onBlur={() => sendTyping(false)}
          placeholder="Type a message..."
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="h-40 overflow-y-auto border rounded p-2">
        {messages.map((msg, index) => (
          <div key={index} className="text-sm mb-1">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};
