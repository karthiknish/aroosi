import { useState, useEffect, useCallback } from 'react';
// @ts-expect-error clerk expo types
import { useUser } from '@clerk/clerk-expo';
import { useApiClient } from '../utils/api';
import { Interest } from '../types';

export interface UseInterestsResult {
  // Data
  sentInterests: Interest[];
  receivedInterests: Interest[];
  
  // Loading states
  loading: boolean;
  sending: boolean;
  responding: boolean;
  
  // Actions
  loadSentInterests: () => Promise<void>;
  loadReceivedInterests: () => Promise<void>;
  sendInterest: (toUserId: string) => Promise<boolean>;
  respondToInterest: (interestId: string, response: 'accept' | 'reject') => Promise<boolean>;
  removeInterest: (toUserId: string) => Promise<boolean>;
  
  // Computed values
  totalSentCount: number;
  pendingReceivedCount: number;
  matchedCount: number;
}

export function useInterests(): UseInterestsResult {
  const { user } = useUser();
  const apiClient = useApiClient();
  
  const [sentInterests, setSentInterests] = useState<Interest[]>([]);
  const [receivedInterests, setReceivedInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);

  // Load sent interests
  const loadSentInterests = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getSentInterests(user.id);
      if (response.success && response.data) {
        setSentInterests(response.data.interests || response.data);
      }
    } catch (error) {
      console.error('Error loading sent interests:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiClient]);

  // Load received interests
  const loadReceivedInterests = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getReceivedInterests(user.id);
      if (response.success && response.data) {
        setReceivedInterests(response.data.interests || response.data);
      }
    } catch (error) {
      console.error('Error loading received interests:', error);
    } finally {
      setLoading(false);
    }
  }, [user, apiClient]);

  // Send interest
  const sendInterest = useCallback(async (toUserId: string): Promise<boolean> => {
    if (!user || sending) return false;
    
    try {
      setSending(true);
      const response = await apiClient.sendInterest(toUserId, user.id);
      
      if (response.success) {
        // Reload sent interests to get updated list
        await loadSentInterests();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending interest:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [user, sending, apiClient, loadSentInterests]);

  // Respond to interest (accept/reject)
  const respondToInterest = useCallback(async (
    interestId: string, 
    response: 'accept' | 'reject'
  ): Promise<boolean> => {
    if (responding) return false;
    
    try {
      setResponding(true);
      const result = await apiClient.respondToInterest(interestId, response);
      
      if (result.success) {
        // Update local state
        setReceivedInterests(prev => 
          prev.map(interest => 
            interest.id === interestId 
              ? { ...interest, status: response === 'accept' ? 'matched' : 'declined' }
              : interest
          )
        );
        
        // Also reload sent interests in case this created a match
        await loadSentInterests();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error responding to interest:', error);
      return false;
    } finally {
      setResponding(false);
    }
  }, [responding, apiClient, loadSentInterests]);

  // Remove interest
  const removeInterest = useCallback(async (toUserId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const response = await apiClient.removeInterest(toUserId, user.id);
      
      if (response.success) {
        // Remove from local state
        setSentInterests(prev => 
          prev.filter(interest => interest.toUserId !== toUserId)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing interest:', error);
      return false;
    }
  }, [user, apiClient]);

  // Computed values
  const totalSentCount = sentInterests.length;
  const pendingReceivedCount = receivedInterests.filter(
    interest => interest.status === 'sent' || interest.status === 'received'
  ).length;
  const matchedCount = sentInterests.filter(
    interest => interest.status === 'matched'
  ).length;

  // Auto-load on mount and user change
  useEffect(() => {
    if (user) {
      loadSentInterests();
      loadReceivedInterests();
    }
  }, [user, loadSentInterests, loadReceivedInterests]);

  return {
    // Data
    sentInterests,
    receivedInterests,
    
    // Loading states
    loading,
    sending,
    responding,
    
    // Actions
    loadSentInterests,
    loadReceivedInterests,
    sendInterest,
    respondToInterest,
    removeInterest,
    
    // Computed values
    totalSentCount,
    pendingReceivedCount,
    matchedCount,
  };
}

// Hook for checking interest status between two users
export function useInterestStatus(otherUserId?: string) {
  const { user } = useUser();
  const apiClient = useApiClient();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user || !otherUserId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getInterestStatus(user.id, otherUserId);
      if (response.success && response.data) {
        setStatus(response.data.status);
      }
    } catch (error) {
      console.error('Error checking interest status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, otherUserId, apiClient]);

  useEffect(() => {
    if (user && otherUserId) {
      checkStatus();
    }
  }, [user, otherUserId, checkStatus]);

  return {
    status,
    loading,
    checkStatus,
  };
}