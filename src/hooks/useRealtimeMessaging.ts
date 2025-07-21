import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "./useSubscription";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { matchMessages } from "@/lib/api/matchMessages";

// Types aligned with web platform structure
interface RealtimeMessage {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";
  audioStorageId?: string;
  imageStorageId?: string;
  duration?: number;
  createdAt: number;
  readAt?: number;
  isDelivered?: boolean;
}

interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface RealtimeMessagingState {
  messages: RealtimeMessage[];
  typingIndicators: Map<string, boolean>;
  connectionStatus: ConnectionStatus;
}

// WebSocket implementation for web platform
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isConnected = false;

  constructor(
    private url: string,
    private token: string,
    private onMessage: (data: any) => void,
    private onConnectionChange: (status: ConnectionStatus) => void
  ) {}

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.onConnectionChange({
      isConnected: false,
      isConnecting: true,
      error: null,
    });

    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange({
          isConnected: true,
          isConnecting: false,
          error: null,
        });

        // Send queued messages
        this.messageQueue.forEach((message) => this.send(message));
        this.messageQueue = [];
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        this.isConnected = false;
        this.onConnectionChange({
          isConnected: false,
          isConnecting: false,
          error: event.reason || "Connection closed",
        });

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.onConnectionChange({
          isConnected: false,
          isConnecting: false,
          error: "Connection error",
        });
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.onConnectionChange({
        isConnected: false,
        isConnecting: false,
        error: "Failed to create connection",
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      this.messageQueue.push(data);
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export function useRealtimeMessaging() {
  const { token, user } = useAuth();
  const { data: subscriptionStatus } = useSubscriptionStatus();
  const [state, setState] = useState<RealtimeMessagingState>({
    messages: [],
    typingIndicators: new Map(),
    connectionStatus: {
      isConnected: false,
      isConnecting: false,
      error: null,
    },
  });

  const wsService = useRef<WebSocketService | null>(null);

  // Initialize WebSocket connection
  const initializeConnection = useCallback(() => {
    if (!token || !user?.id) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    wsService.current = new WebSocketService(
      wsUrl,
      token,
      (data) => {
        // Handle incoming messages
        switch (data.type) {
          case "message:new":
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, data.message],
            }));
            if (data.message.fromUserId !== user.id) {
              showSuccessToast("New message received");
            }
            break;

          case "message:read":
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg._id === data.messageId
                  ? { ...msg, readAt: Date.now() }
                  : msg
              ),
            }));
            break;

          case "message:delivered":
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg._id === data.messageId ? { ...msg, isDelivered: true } : msg
              ),
            }));
            break;

          case "typing:start":
            setState((prev) => ({
              ...prev,
              typingIndicators: new Map(prev.typingIndicators).set(
                data.userId,
                true
              ),
            }));
            break;

          case "typing:stop":
            setState((prev) => ({
              ...prev,
              typingIndicators: new Map(prev.typingIndicators).set(
                data.userId,
                false
              ),
            }));
            break;
        }
      },
      (status) => {
        setState((prev) => ({ ...prev, connectionStatus: status }));
      }
    );

    wsService.current.connect();
  }, [token, user?.id]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (token && user?.id) {
      initializeConnection();
    }

    return () => {
      if (wsService.current) {
        wsService.current.disconnect();
      }
    };
  }, [token, user?.id, initializeConnection]);

  // Join conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (wsService.current) {
      wsService.current.send({
        type: "join:conversation",
        conversationId,
      });
    }
  }, []);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (wsService.current) {
      wsService.current.send({
        type: "leave:conversation",
        conversationId,
      });
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (messageData: {
      conversationId: string;
      toUserId: string;
      text: string;
      messageType: "text" | "voice" | "image";
      audioStorageId?: string;
      imageStorageId?: string;
      duration?: number;
    }) => {
      if (!wsService.current || !state.connectionStatus.isConnected) {
        showErrorToast("Not connected to messaging service");
        return false;
      }

      try {
        wsService.current.send({
          type: "message:send",
          ...messageData,
        });
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        showErrorToast("Failed to send message");
        return false;
      }
    },
    [state.connectionStatus.isConnected]
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    async (messageId: string, conversationId: string) => {
      if (!wsService.current || !state.connectionStatus.isConnected) {
        return false;
      }

      try {
        wsService.current.send({
          type: "message:markRead",
          messageId,
          conversationId,
        });

        // Also update via REST API for persistence
        await matchMessages.markConversationAsRead({
          conversationId,
          userId: user?.id || "",
        });
        return true;
      } catch (error) {
        console.error("Error marking message as read:", error);
        return false;
      }
    },
    [state.connectionStatus.isConnected, user?.id]
  );

  // Start typing
  const startTyping = useCallback(
    (conversationId: string) => {
      if (wsService.current && state.connectionStatus.isConnected) {
        wsService.current.send({
          type: "typing:start",
          conversationId,
        });
      }
    },
    [state.connectionStatus.isConnected]
  );

  // Stop typing
  const stopTyping = useCallback(
    (conversationId: string) => {
      if (wsService.current && state.connectionStatus.isConnected) {
        wsService.current.send({
          type: "typing:stop",
          conversationId,
        });
      }
    },
    [state.connectionStatus.isConnected]
  );

  // Get typing status for a user
  const isUserTyping = useCallback(
    (userId: string): boolean => {
      return state.typingIndicators.get(userId) || false;
    },
    [state.typingIndicators]
  );

  // Get messages for a conversation
  const getMessages = useCallback(
    (conversationId: string): RealtimeMessage[] => {
      return state.messages.filter(
        (msg) => msg.conversationId === conversationId
      );
    },
    [state.messages]
  );

  // Clear messages for a conversation
  const clearMessages = useCallback((conversationId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter(
        (msg) => msg.conversationId !== conversationId
      ),
    }));
  }, []);

  return {
    // State
    messages: state.messages,
    typingIndicators: state.typingIndicators,
    connectionStatus: state.connectionStatus,

    // Actions
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessageAsRead,
    startTyping,
    stopTyping,
    isUserTyping,
    getMessages,
    clearMessages,
  };
}
