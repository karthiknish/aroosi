"use client";

import { useState, useEffect, useCallback } from "react";
import { DeliveryStatus } from "@/components/chat/DeliveryStatus";
import { deliveryReceiptsAPI } from "@/lib/api/deliveryReceipts";
import { markConversationRead } from "@/lib/api/conversation";

interface DeliveryReceipt {
  messageId: string;
  userId: string;
  status: "delivered" | "read" | "failed";
  timestamp: number;
}

interface UseDeliveryReceiptsProps {
  conversationId: string;
}

export function useDeliveryReceipts({
  conversationId,
}: UseDeliveryReceiptsProps): {
  receipts: Record<string, DeliveryReceipt[]>;
  getMessageDeliveryStatus: (
    messageId: string,
    isCurrentUser: boolean,
  ) => DeliveryStatus;
  markMessageAsPending: (messageId: string) => void;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsRead: (messageId: string) => Promise<void>;
  markMessageAsDelivered: (messageId: string) => void;
  sendDeliveryReceipt: (
    messageId: string,
    status: "delivered" | "read" | "failed",
  ) => Promise<void>;
} {
  const [receipts, setReceipts] = useState<Record<string, DeliveryReceipt[]>>(
    {},
  );
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(
    new Set(),
  );

  // Send delivery receipt
  const sendDeliveryReceipt = useCallback(
    async (messageId: string, status: "delivered" | "read" | "failed") => {
      try {
        await deliveryReceiptsAPI.sendReceipt(messageId, status);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error sending delivery receipt:", error.message);
        } else {
          console.error("Error sending delivery receipt:", error);
        }
      }
    },
    [],
  );

  // Fetch delivery receipts for conversation
  const fetchDeliveryReceipts = useCallback(async () => {
    try {
      const list = await deliveryReceiptsAPI.getReceipts(conversationId);
      const receiptsByMessage: Record<string, DeliveryReceipt[]> = {};
      list.forEach((r) => {
        const receipt: DeliveryReceipt = {
          messageId: r.messageId,
          userId: r.userId,
          status: r.status,
          timestamp: r.updatedAt,
        };
        if (!receiptsByMessage[receipt.messageId]) {
          receiptsByMessage[receipt.messageId] = [];
        }
        receiptsByMessage[receipt.messageId].push(receipt);
      });
      setReceipts(receiptsByMessage);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching delivery receipts:", error.message);
      } else {
        console.error("Error fetching delivery receipts:", error);
      }
    }
  }, [conversationId]);

  // Get delivery status for a message
  const getMessageDeliveryStatus = useCallback(
    (messageId: string, isCurrentUser: boolean): DeliveryStatus => {
      if (!isCurrentUser) return "sent";

      if (pendingMessages.has(messageId)) {
        return "sending";
      }

      const messageReceipts = receipts[messageId] || [];

      if (messageReceipts.length === 0) {
        return "sent";
      }

      // Check for read status first (highest priority)
      if (messageReceipts.some((receipt) => receipt.status === "read")) {
        return "read";
      }

      // Check for failed status
      if (messageReceipts.some((receipt) => receipt.status === "failed")) {
        return "failed";
      }

      // Check for delivered status
      if (messageReceipts.some((receipt) => receipt.status === "delivered")) {
        return "delivered";
      }

      return "sent";
    },
    [receipts, pendingMessages],
  );

  // Mark message as pending
  const markMessageAsPending = useCallback((messageId: string) => {
    setPendingMessages((prev) => new Set(prev).add(messageId));
  }, []);

  // Mark message as sent (remove from pending)
  const markMessageAsSent = useCallback((messageId: string) => {
    setPendingMessages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  }, []);

  // Mark message as read (for incoming messages)
  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      try {
        await markConversationRead({ conversationId });
      } catch (e) {
        console.warn("markMessageAsRead failed, falling back to delivery receipt", e);
        await sendDeliveryReceipt(messageId, "read");
      }
    },
    [conversationId, sendDeliveryReceipt],
  );

  // Mark message as delivered (for incoming messages)
  const markMessageAsDelivered = useCallback(
    (messageId: string) => {
      void sendDeliveryReceipt(messageId, "delivered");
    },
    [sendDeliveryReceipt],
  );

  // Fetch receipts on mount and periodically
  useEffect(() => {
    void fetchDeliveryReceipts();

    const interval = setInterval(() => {
      void fetchDeliveryReceipts();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchDeliveryReceipts]);

  return {
    receipts,
    getMessageDeliveryStatus,
    markMessageAsPending,
    markMessageAsSent,
    markMessageAsRead,
    markMessageAsDelivered,
    sendDeliveryReceipt,
  };
}
