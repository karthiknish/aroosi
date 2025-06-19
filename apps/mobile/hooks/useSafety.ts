import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../utils/api';
import { BlockedUser, ReportReason } from '../types';

export interface UseSafetyResult {
  // Data
  blockedUsers: BlockedUser[];
  
  // Loading states
  loading: boolean;
  reporting: boolean;
  blocking: boolean;
  
  // Actions
  reportUser: (userId: string, reason: ReportReason, description?: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  checkIfBlocked: (userId: string) => Promise<boolean>;
  loadBlockedUsers: () => Promise<void>;
  
  // Computed values
  isUserBlocked: (userId: string) => boolean;
  blockedUserIds: string[];
}

export function useSafety(): UseSafetyResult {
  const apiClient = useApiClient();
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // Load blocked users
  const loadBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data.blockedUsers || response.data);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Report user
  const reportUser = useCallback(async (
    userId: string, 
    reason: ReportReason, 
    description?: string
  ): Promise<boolean> => {
    if (reporting) return false;
    
    try {
      setReporting(true);
      const response = await apiClient.reportUser(userId, reason, description);
      return response.success;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    } finally {
      setReporting(false);
    }
  }, [reporting, apiClient]);

  // Block user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (blocking) return false;
    
    try {
      setBlocking(true);
      const response = await apiClient.blockUser(userId);
      
      if (response.success) {
        // Reload blocked users to get updated list
        await loadBlockedUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    } finally {
      setBlocking(false);
    }
  }, [blocking, apiClient, loadBlockedUsers]);

  // Unblock user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await apiClient.unblockUser(userId);
      
      if (response.success) {
        // Remove from local state
        setBlockedUsers(prev => 
          prev.filter(blocked => blocked.blockedUserId !== userId)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  }, [apiClient]);

  // Check if specific user is blocked
  const checkIfBlocked = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await apiClient.checkIfBlocked(userId);
      return response.success && response.data?.isBlocked;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }, [apiClient]);

  // Check if user is in local blocked list
  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.some(blocked => blocked.blockedUserId === userId);
  }, [blockedUsers]);

  // Get array of blocked user IDs
  const blockedUserIds = blockedUsers.map(blocked => blocked.blockedUserId);

  // Auto-load blocked users on mount
  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  return {
    // Data
    blockedUsers,
    
    // Loading states
    loading,
    reporting,
    blocking,
    
    // Actions
    reportUser,
    blockUser,
    unblockUser,
    checkIfBlocked,
    loadBlockedUsers,
    
    // Computed values
    isUserBlocked,
    blockedUserIds,
  };
}

// Hook specifically for checking if a user is blocked
export function useBlockStatus(userId?: string) {
  const { isUserBlocked, checkIfBlocked } = useSafety();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!userId) return;
    
    // First check local state
    const locallyBlocked = isUserBlocked(userId);
    if (locallyBlocked) {
      setIsBlocked(true);
      return;
    }
    
    // Then check with API
    try {
      setLoading(true);
      const blocked = await checkIfBlocked(userId);
      setIsBlocked(blocked);
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, isUserBlocked, checkIfBlocked]);

  useEffect(() => {
    if (userId) {
      checkStatus();
    }
  }, [userId, checkStatus]);

  return {
    isBlocked,
    loading,
    checkStatus,
  };
}