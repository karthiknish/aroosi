import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthContext as useAuth } from "@/components/FirebaseAuthProvider";
import { useSubscriptionStatus } from "./useSubscription";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { matchMessages } from "@/lib/api/matchMessages";
import type { MessageType } from "@aroosi/shared/types";
import {
  WebSocketService,
  RealtimeMessage,
  ConnectionStatus,
} from "@/lib/api/webSocketService";

interface RealtimeMessagingState {
  messages: RealtimeMessage[];
  typingIndicators: Map<string, boolean>;
  connectionStatus: ConnectionStatus;
}

export function useRealtimeMessaging() {
  const { user } = useAuth();
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
    if (!user?.uid) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    wsService.current = new WebSocketService(
      wsUrl,
      (data) => {
        // Handle incoming messages
        switch (data.type) {
          case "message:new":
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, data.message],
            }));
            if (data.message.fromUserId !== user.uid) {
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
  }, [user?.uid]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (user?.uid) {
      initializeConnection();
    }

    return () => {
      if (wsService.current) {
        wsService.current.disconnect();
      }
    };
  }, [user?.uid, initializeConnection]);

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
      messageType: MessageType;
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
      } catch {
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
          userId: user?.uid || "",
        });
        return true;
      } catch {
        return false;
      }
    },
    [state.connectionStatus.isConnected, user?.uid]
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
