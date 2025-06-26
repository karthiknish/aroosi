'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { MessageData, MessageEvent, createMessageEvent } from '@/lib/utils/messageUtils';

interface UseRealTimeMessagesProps {
  conversationId: string;
  initialMessages?: MessageData[];
}

interface UseRealTimeMessagesReturn {
  messages: MessageData[];
  isTyping: Record<string, boolean>;
  isConnected: boolean;
  sendMessage: (text: string, toUserId: string) => Promise<void>;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refreshMessages: () => Promise<void>;
  error: string | null;
}

export function useRealTimeMessages({ 
  conversationId, 
  initialMessages = [] 
}: UseRealTimeMessagesProps): UseRealTimeMessagesReturn {
  const { getToken, userId } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize EventSource connection for real-time updates
  const initializeConnection = useCallback(async () => {
    if (!userId || !conversationId) return;

    try {
      const token = await getToken();
      if (!token) return;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection
      const eventSource = new EventSource(
        `/api/messages/events?conversationId=${conversationId}&token=${token}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const messageEvent: MessageEvent = JSON.parse(event.data);
          handleRealTimeEvent(messageEvent);
        } catch (err) {
          console.error('Error parsing real-time message:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setError('Connection lost. Attempting to reconnect...');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          initializeConnection();
        }, 3000);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('Error initializing real-time connection:', err);
      setError('Failed to establish real-time connection');
    }
  }, [userId, conversationId, getToken]);

  // Handle real-time events
  const handleRealTimeEvent = useCallback((event: MessageEvent) => {
    switch (event.type) {
      case 'message_sent':
        if (event.data && event.conversationId === conversationId) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(msg => msg._id === (event.data as MessageData)._id);
            if (exists) return prev;
            return [...prev, event.data as MessageData];
          });
        }
        break;

      case 'message_read':
        if (event.data && event.conversationId === conversationId) {
          setMessages(prev => prev.map(msg => 
            (event.data as { messageIds: string[] }).messageIds.includes(msg._id)
              ? { ...msg, isRead: true, readAt: event.timestamp }
              : msg
          ));
        }
        break;

      case 'typing_start':
        if (event.userId !== userId && event.conversationId === conversationId) {
          setIsTyping(prev => ({ ...prev, [event.userId]: true }));
        }
        break;

      case 'typing_stop':
        if (event.userId !== userId && event.conversationId === conversationId) {
          setIsTyping(prev => ({ ...prev, [event.userId]: false }));
        }
        break;
    }
  }, [conversationId, userId]);

  // Send a text message
  const sendMessage = useCallback(async (text: string, toUserId: string) => {
    if (!userId || !text.trim()) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/match-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          toUserId,
          text: text.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();
      
      // Optimistically add message to local state
      const newMessage: MessageData = {
        _id: result.data._id,
        conversationId,
        fromUserId: userId,
        toUserId,
        text: text.trim(),
        type: 'text',
        isRead: false,
        _creationTime: Date.now(),
      };

      setMessages(prev => [...prev, newMessage]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [userId, conversationId, getToken]);

  // Send typing indicators
  const sendTypingStart = useCallback(() => {
    if (!userId || !eventSourceRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing start (implementation would depend on your WebSocket/SSE setup)
    // const event = createMessageEvent('typing_start', conversationId, userId);
    
    // Set timeout to automatically stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);

  }, [userId, conversationId]);

  const sendTypingStop = useCallback(() => {
    if (!userId || !eventSourceRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Broadcast typing stop
    // const event = createMessageEvent('typing_stop', conversationId, userId);
    
  }, [userId, conversationId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!userId || messageIds.length === 0) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messageIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark messages as read');
      }

      // Optimistically update local state
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg._id)
          ? { ...msg, isRead: true, readAt: Date.now() }
          : msg
      ));

    } catch (err) {
      console.error('Error marking messages as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
    }
  }, [userId, getToken]);

  // Refresh messages from server
  const refreshMessages = useCallback(async () => {
    if (!userId) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(
        `/api/match-messages?conversationId=${conversationId}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch messages');
      }

      const result = await response.json();
      setMessages(result.data.messages || []);

    } catch (err) {
      console.error('Error refreshing messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh messages');
    }
  }, [userId, conversationId, getToken]);

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [initializeConnection]);

  // Auto-mark messages as read when they come in
  useEffect(() => {
    if (!userId) return;

    const unreadMessages = messages.filter(msg => 
      msg.toUserId === userId && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(msg => msg._id);
      markAsRead(messageIds);
    }
  }, [messages, userId, markAsRead]);

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    refreshMessages,
    error,
  };
}