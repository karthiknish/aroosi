"use client";

import { useState, useEffect, useCallback } from "react";
import { DeliveryStatus } from "@/components/chat/DeliveryStatus";

interface DeliveryReceipt {
  messageId: string;
  userId: string;
  status: "delivered" | "read" | "failed";
  timestamp: number;
}

interface UseDeliveryReceiptsProps {
  conversationId: string;
  token: string;
}

export function useDeliveryReceipts({
  conversationId,
  token,
}: UseDeliveryReceiptsProps): {
  receipts: Record<string, DeliveryReceipt[]>;
  getMessageDeliveryStatus: (
    messageId: string,
    isCurrentUser: boolean,
  ) => DeliveryStatus;
  markMessageAsPending: (messageId: string) => void;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsRead: (messageId: string) => void;
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
        const response = await fetch("/api/delivery-receipts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageId,
            status,
          }),
        });

        if (response.ok) {
          const data: unknown = await response.json();
          console.log("Delivery receipt sent:", data);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error sending delivery receipt:", error.message);
        } else {
          console.error("Error sending delivery receipt:", error);
        }
      }
    },
    [token],
  );

  // Fetch delivery receipts for conversation
  const fetchDeliveryReceipts = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/delivery-receipts?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data: unknown = await response.json();
        const receiptsByMessage: Record<string, DeliveryReceipt[]> = {};
        if (
          typeof data === "object" &&
          data !== null &&
          "deliveryReceipts" in data &&
          Array.isArray(
            (data as { deliveryReceipts: unknown }).deliveryReceipts,
          )
        ) {
          (
            data as { deliveryReceipts: DeliveryReceipt[] }
          ).deliveryReceipts.forEach((receipt: DeliveryReceipt) => {
            if (!receiptsByMessage[receipt.messageId]) {
              receiptsByMessage[receipt.messageId] = [];
            }
            receiptsByMessage[receipt.messageId].push(receipt);
          });
        }
        setReceipts(receiptsByMessage);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching delivery receipts:", error.message);
      } else {
        console.error("Error fetching delivery receipts:", error);
      }
    }
  }, [conversationId, token]);

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
    (messageId: string) => {
      void sendDeliveryReceipt(messageId, "read");
    },
    [sendDeliveryReceipt],
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
