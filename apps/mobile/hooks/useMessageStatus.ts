import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api';
import { Message, MessageStatus, MessageDeliveryReceipt } from '../types/message';

export interface UseMessageStatusResult {
  // Message tracking
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  getMessageStatus: (messageId: string) => MessageStatus;
  
  // Delivery receipts
  markAsDelivered: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  sendDeliveryReceipt: (messageId: string, status: MessageStatus) => Promise<void>;
  
  // Batch operations
  markMultipleAsRead: (messageIds: string[]) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  
  // Helpers
  isMessageRead: (message: Message, currentUserId: string) => boolean;
  getReadByUsers: (message: Message) => string[];
  getDeliveredToUsers: (message: Message) => string[];
}

export function useMessageStatus(
  conversationId: string,
  currentUserId: string
): UseMessageStatusResult {
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatus>>(new Map());
  const apiClient = useApiClient();

  // Update message status locally
  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus) => {
    setMessageStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, status);
      return newMap;
    });
  }, []);

  // Get message status
  const getMessageStatus = useCallback((messageId: string): MessageStatus => {
    return messageStatuses.get(messageId) || 'sent';
  }, [messageStatuses]);

  // Send delivery receipt to server
  const sendDeliveryReceipt = useCallback(async (
    messageId: string, 
    status: MessageStatus
  ): Promise<void> => {
    try {
      await apiClient.sendDeliveryReceipt(messageId, status);
      updateMessageStatus(messageId, status);
    } catch (error) {
      console.error('Failed to send delivery receipt:', error);
    }
  }, [apiClient, updateMessageStatus]);

  // Mark message as delivered
  const markAsDelivered = useCallback(async (messageId: string): Promise<void> => {
    await sendDeliveryReceipt(messageId, 'delivered');
  }, [sendDeliveryReceipt]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    await sendDeliveryReceipt(messageId, 'read');
  }, [sendDeliveryReceipt]);

  // Mark multiple messages as read
  const markMultipleAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    try {
      await apiClient.markMessagesAsRead(messageIds);
      
      // Update local status for all messages
      messageIds.forEach(messageId => {
        updateMessageStatus(messageId, 'read');
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [apiClient, updateMessageStatus]);

  // Mark entire conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string): Promise<void> => {
    try {
      await apiClient.markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  }, [apiClient]);

  // Check if message is read by recipient
  const isMessageRead = useCallback((message: Message, currentUserId: string): boolean => {
    if (message.senderId === currentUserId) {
      // For sent messages, check if recipient has read it
      return message.deliveryReceipts?.some(receipt => 
        receipt.userId !== currentUserId && receipt.status === 'read'
      ) || false;
    }
    return false;
  }, []);

  // Get users who have read the message
  const getReadByUsers = useCallback((message: Message): string[] => {
    return message.deliveryReceipts
      ?.filter(receipt => receipt.status === 'read')
      ?.map(receipt => receipt.userId) || [];
  }, []);

  // Get users who have received the message
  const getDeliveredToUsers = useCallback((message: Message): string[] => {
    return message.deliveryReceipts
      ?.filter(receipt => receipt.status === 'delivered' || receipt.status === 'read')
      ?.map(receipt => receipt.userId) || [];
  }, []);

  // Listen for delivery receipt updates
  useEffect(() => {
    const handleDeliveryReceiptUpdate = (data: MessageDeliveryReceipt) => {
      updateMessageStatus(data.messageId, data.status);
    };

    // In a real app, you'd listen to WebSocket events here
    // For now, we'll simulate with periodic polling
    const pollDeliveryReceipts = async () => {
      try {
        const response = await apiClient.getDeliveryReceipts(conversationId);
        if (response.success && response.data) {
          const receipts = response.data.receipts || [];
          
          receipts.forEach((receipt: MessageDeliveryReceipt) => {
            updateMessageStatus(receipt.messageId, receipt.status);
          });
        }
      } catch (error) {
        console.error('Failed to poll delivery receipts:', error);
      }
    };

    // Poll every 10 seconds for delivery receipts
    const pollInterval = setInterval(pollDeliveryReceipts, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [conversationId, apiClient, updateMessageStatus]);

  return {
    updateMessageStatus,
    getMessageStatus,
    markAsDelivered,
    markAsRead,
    sendDeliveryReceipt,
    markMultipleAsRead,
    markConversationAsRead,
    isMessageRead,
    getReadByUsers,
    getDeliveredToUsers,
  };
}