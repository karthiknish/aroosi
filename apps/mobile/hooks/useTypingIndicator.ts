import { useState, useEffect, useRef, useCallback } from 'react';
import { useApiClient } from '../utils/api';

export interface TypingState {
  isTyping: boolean;
  users: string[]; // User IDs who are typing
}

export interface UseTypingIndicatorResult {
  // Current typing state
  typingState: TypingState;
  
  // Actions
  startTyping: () => void;
  stopTyping: () => void;
  setTyping: (isTyping: boolean) => void;
  
  // Helpers
  isUserTyping: (userId: string) => boolean;
  getTypingUsers: () => string[];
  getTypingText: () => string;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_DEBOUNCE = 300; // 300ms

export function useTypingIndicator(
  conversationId: string,
  currentUserId: string
): UseTypingIndicatorResult {
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    users: []
  });
  
  const apiClient = useApiClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isCurrentlyTyping = useRef(false);

  // Start typing
  const startTyping = useCallback(() => {
    // Clear any existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce typing start to avoid too many API calls
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!isCurrentlyTyping.current) {
        isCurrentlyTyping.current = true;
        
        try {
          await apiClient.sendTypingIndicator(conversationId, 'start');
        } catch (error) {
          console.error('Failed to send typing indicator:', error);
        }
      }

      // Auto-stop typing after timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, TYPING_TIMEOUT);
    }, TYPING_DEBOUNCE);
  }, [conversationId, apiClient]);

  // Stop typing
  const stopTyping = useCallback(async () => {
    // Clear timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (isCurrentlyTyping.current) {
      isCurrentlyTyping.current = false;
      
      try {
        await apiClient.sendTypingIndicator(conversationId, 'stop');
      } catch (error) {
        console.error('Failed to send typing indicator:', error);
      }
    }
  }, [conversationId, apiClient]);

  // Set typing state (convenience method)
  const setTyping = useCallback((isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Listen for typing indicators from other users
  useEffect(() => {
    const handleTypingUpdate = (data: any) => {
      const { userId, action, conversationId: msgConversationId } = data;
      
      // Only handle typing for this conversation
      if (msgConversationId !== conversationId) {
        return;
      }

      // Don't show typing indicator for current user
      if (userId === currentUserId) {
        return;
      }

      setTypingState(prev => {
        let newUsers = [...prev.users];
        
        if (action === 'start') {
          // Add user to typing list if not already there
          if (!newUsers.includes(userId)) {
            newUsers.push(userId);
          }
        } else if (action === 'stop') {
          // Remove user from typing list
          newUsers = newUsers.filter(id => id !== userId);
        }

        return {
          isTyping: newUsers.length > 0,
          users: newUsers
        };
      });
    };

    // In a real app, you'd listen to WebSocket events here
    // For now, we'll simulate with a polling mechanism
    const pollTypingIndicators = async () => {
      try {
        const response = await apiClient.getTypingIndicators(conversationId);
        if (response.success && response.data) {
          const typingUsers = response.data.typingUsers || [];
          const filteredUsers = typingUsers.filter((userId: string) => userId !== currentUserId);
          
          setTypingState({
            isTyping: filteredUsers.length > 0,
            users: filteredUsers
          });
        }
      } catch (error) {
        console.error('Failed to poll typing indicators:', error);
      }
    };

    // Poll every 2 seconds for typing indicators
    const pollInterval = setInterval(pollTypingIndicators, 2000);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      stopTyping();
    };
  }, [conversationId, currentUserId, apiClient, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  // Helper functions
  const isUserTyping = useCallback((userId: string) => {
    return typingState.users.includes(userId);
  }, [typingState.users]);

  const getTypingUsers = useCallback(() => {
    return typingState.users;
  }, [typingState.users]);

  const getTypingText = useCallback(() => {
    const count = typingState.users.length;
    
    if (count === 0) {
      return '';
    } else if (count === 1) {
      return 'typing...';
    } else if (count === 2) {
      return 'typing...';
    } else {
      return `${count} people are typing...`;
    }
  }, [typingState.users.length]);

  return {
    typingState,
    startTyping,
    stopTyping,
    setTyping,
    isUserTyping,
    getTypingUsers,
    getTypingText,
  };
}