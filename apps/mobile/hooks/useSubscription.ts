import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useApiClient } from '../utils/api';
import { 
  UserSubscription, 
  FeatureUsage, 
  SubscriptionInfo, 
  SubscriptionTier,
  FeatureLimits 
} from '../types/subscription';
import { FEATURE_LIMITS_BY_TIER } from '../utils/inAppPurchases';

export interface UseSubscriptionResult extends SubscriptionInfo {
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshSubscription: () => Promise<void>;
  trackFeatureUsage: (feature: keyof FeatureUsage, increment?: number) => Promise<void>;
  checkFeatureAccess: (feature: keyof FeatureLimits) => boolean;
  getRemainingQuota: (feature: keyof FeatureUsage) => number;
  
  // Subscription management
  purchaseSubscription: (planId: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  updatePaymentMethod: () => Promise<boolean>;
}

export function useSubscription(): UseSubscriptionResult {
  const { userId } = useAuth();
  const apiClient = useApiClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<FeatureUsage | null>(null);

  // Load subscription data
  const loadSubscriptionData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const [subscriptionResponse, usageResponse] = await Promise.all([
        apiClient.getSubscriptionStatus(),
        apiClient.getUsageStats(),
      ]);

      if (subscriptionResponse.success && subscriptionResponse.data) {
        setSubscription(subscriptionResponse.data.subscription);
      }

      if (usageResponse.success && usageResponse.data) {
        setUsage(usageResponse.data.usage);
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  }, [userId, apiClient]);

  // Load subscription data on mount and user change
  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Get current subscription tier
  const getCurrentTier = useCallback((): SubscriptionTier => {
    if (!subscription || !hasActiveSubscription) {
      return 'free';
    }
    return subscription.tier;
  }, [subscription]);

  // Check if subscription is active
  const hasActiveSubscription = useCallback((): boolean => {
    if (!subscription) return false;
    
    const now = Date.now();
    const isActive = subscription.status === 'active' && 
                    subscription.currentPeriodEnd > now;
    
    return isActive;
  }, [subscription]);

  // Check if trial is active
  const isTrialActive = useCallback((): boolean => {
    if (!subscription || !subscription.trialEnd) return false;
    
    const now = Date.now();
    return subscription.trialEnd > now;
  }, [subscription]);

  // Get days until expiry
  const daysUntilExpiry = useCallback((): number => {
    if (!subscription) return 0;
    
    const now = Date.now();
    const expiryDate = subscription.trialEnd || subscription.currentPeriodEnd;
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysLeft);
  }, [subscription]);

  // Get feature limits for current tier
  const getFeatureLimits = useCallback((): FeatureLimits => {
    const tier = getCurrentTier();
    return FEATURE_LIMITS_BY_TIER[tier] || FEATURE_LIMITS_BY_TIER.free;
  }, [getCurrentTier]);

  // Check if user can access a feature
  const canAccessFeature = useCallback((feature: keyof FeatureLimits): boolean => {
    const limits = getFeatureLimits();
    return limits[feature] === true;
  }, [getFeatureLimits]);

  // Check feature access (public method)
  const checkFeatureAccess = useCallback((feature: keyof FeatureLimits): boolean => {
    return canAccessFeature(feature);
  }, [canAccessFeature]);

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback((feature: keyof FeatureUsage): number => {
    if (!usage) return 0;
    
    const limits = getFeatureLimits();
    const usageKey = feature as keyof FeatureUsage;
    const limitKey = `max${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof FeatureLimits;
    
    const currentUsage = usage[usageKey] as number || 0;
    const maxUsage = limits[limitKey] as number;
    
    if (maxUsage === null) return Infinity; // Unlimited
    
    return Math.max(0, maxUsage - currentUsage);
  }, [usage, getFeatureLimits]);

  // Get remaining quota (public method)
  const getRemainingQuota = useCallback((feature: keyof FeatureUsage): number => {
    return getRemainingUsage(feature);
  }, [getRemainingUsage]);

  // Get usage percentage
  const getUsagePercentage = useCallback((feature: keyof FeatureUsage): number => {
    if (!usage) return 0;
    
    const limits = getFeatureLimits();
    const usageKey = feature as keyof FeatureUsage;
    const limitKey = `max${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof FeatureLimits;
    
    const currentUsage = usage[usageKey] as number || 0;
    const maxUsage = limits[limitKey] as number;
    
    if (maxUsage === null) return 0; // Unlimited
    if (maxUsage === 0) return 100;
    
    return Math.min(100, (currentUsage / maxUsage) * 100);
  }, [usage, getFeatureLimits]);

  // Track feature usage
  const trackFeatureUsage = useCallback(async (
    feature: keyof FeatureUsage, 
    increment = 1
  ): Promise<void> => {
    if (!userId) return;

    try {
      const response = await apiClient.trackFeatureUsage(feature);
      
      if (response.success && response.data) {
        setUsage(response.data.usage);
      }
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }, [userId, apiClient]);

  // Purchase subscription
  const purchaseSubscription = useCallback(async (planId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Use in-app purchase flow from inAppPurchases utility
      const { inAppPurchaseManager } = await import('../utils/inAppPurchases');
      const success = await inAppPurchaseManager.purchaseProduct(planId);
      
      if (success) {
        await refreshSubscription();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return false;
    }
  }, [userId, refreshSubscription]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await apiClient.restorePurchases();
      
      if (response.success) {
        await refreshSubscription();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }, [userId, apiClient, refreshSubscription]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      const response = await apiClient.cancelSubscription();
      
      if (response.success) {
        await refreshSubscription();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }, [subscription, apiClient, refreshSubscription]);

  // Update payment method
  const updatePaymentMethod = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      // For mobile apps, payment method updates typically go through app store
      // This could redirect to account settings or show a modal
      const response = await apiClient.updateSubscriptionTier(subscription.tier);
      
      if (response.success) {
        await refreshSubscription();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating payment method:', error);
      return false;
    }
  }, [subscription, apiClient, refreshSubscription]);

  // Create default usage object if none exists
  const currentUsage = usage || {
    userId: userId || '',
    tier: getCurrentTier(),
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    messagesSent: 0,
    interestsSent: 0,
    profileViews: 0,
    searchesPerformed: 0,
    profileBoosts: 0,
    limits: getFeatureLimits(),
    lastUpdated: Date.now(),
    periodStart: new Date().setDate(1),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime(),
  };

  return {
    // Data
    subscription,
    usage: currentUsage,
    hasActiveSubscription: hasActiveSubscription(),
    isTrialActive: isTrialActive(),
    daysUntilExpiry: daysUntilExpiry(),
    
    // Loading states
    loading,
    error,
    
    // Helper methods
    canAccessFeature,
    getRemainingUsage,
    getUsagePercentage,
    
    // Public methods
    refreshSubscription,
    trackFeatureUsage,
    checkFeatureAccess,
    getRemainingQuota,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    updatePaymentMethod,
  };
}