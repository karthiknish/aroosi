import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api';
import { Message, Match } from '../types';
import { PushNotificationService } from '../services/PushNotificationService';

export interface UseMessagingProps {
  matchId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMessaging({ 
  matchId, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UseMessagingProps = {}) {
  const apiClient = useApiClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load matches
  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMatches();
      if (response.success && response.data) {
        const matchesList = response.data.matches || response.data;
        setMatches(matchesList);
        
        // Extract unread counts
        const counts: Record<string, number> = {};
        matchesList.forEach((match: Match) => {
          if (match.unreadCount) {
            counts[match.id] = match.unreadCount;
          }
        });
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load messages for specific match
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return [];
    
    try {
      const response = await apiClient.getMessages(conversationId);
      if (response.success && response.data) {
        const messagesList = response.data.messages || response.data;
        if (conversationId === matchId) {
          setMessages(messagesList);
        }
        return messagesList;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    return [];
  }, [apiClient, matchId]);

  // Send message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!conversationId || !content.trim() || sending) return false;

    try {
      setSending(true);
      const response = await apiClient.sendMessage(conversationId, content.trim());
      
      if (response.success) {
        // Reload messages to get the updated list
        await loadMessages(conversationId);
        
        // Trigger push notification for the recipient (handled by backend)
        // This is just a local notification for testing
        await PushNotificationService.scheduleLocalNotification({
          title: 'Message Sent',
          body: 'Your message has been sent successfully',
        }, 1);
        
        return true;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
    return false;
  }, [apiClient, sending, loadMessages]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await apiClient.markMessagesAsRead(conversationId);
      
      // Update local unread counts
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0,
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [apiClient]);

  // Get total unread count across all conversations
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (matchId) {
        loadMessages(matchId);
      } else {
        loadMatches();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, matchId, loadMessages, loadMatches]);

  // Initial load
  useEffect(() => {
    if (matchId) {
      loadMessages(matchId);
    } else {
      loadMatches();
    }
  }, [matchId, loadMessages, loadMatches]);

  return {
    // Data
    messages,
    matches,
    unreadCounts,
    
    // State
    loading,
    sending,
    
    // Actions
    loadMatches,
    loadMessages,
    sendMessage,
    markAsRead,
    
    // Computed
    getTotalUnreadCount,
  };
}

// Hook specifically for chat screens
export function useChatMessages(matchId: string) {
  return useMessaging({ 
    matchId, 
    autoRefresh: true, 
    refreshInterval: 10000 // Refresh every 10 seconds for active chats
  });
}

// Hook specifically for matches list
export function useMatchesList() {
  return useMessaging({ 
    autoRefresh: true, 
    refreshInterval: 30000 // Refresh every 30 seconds for matches list
  });
}