import { useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { featureGateManager, FeatureAction, FeatureGateOptions } from '../utils/featureGating';

export interface UseFeatureGateResult {
  // Check methods
  checkAccess: (action: FeatureAction, options?: FeatureGateOptions) => boolean;
  canUseFeature: (action: FeatureAction) => boolean;
  getRemainingQuota: (action: FeatureAction) => number;
  
  // Usage tracking
  useFeature: (action: FeatureAction, options?: FeatureGateOptions) => Promise<boolean>;
  
  // Helpers
  isApproachingLimit: (action: FeatureAction) => boolean;
  getUpgradeSuggestion: (action: FeatureAction) => { targetTier: string; benefits: string[] };
  
  // Subscription info
  currentTier: string;
  hasActiveSubscription: boolean;
  daysUntilExpiry: number;
}

export function useFeatureGate(): UseFeatureGateResult {
  const {
    subscription,
    usage,
    hasActiveSubscription,
    daysUntilExpiry,
    trackFeatureUsage,
    canAccessFeature,
    getRemainingUsage,
    getUsagePercentage,
  } = useSubscription();

  const currentTier = subscription?.tier || 'free';

  // Check if user can access a feature without using it
  const checkAccess = useCallback((
    action: FeatureAction, 
    options: FeatureGateOptions = {}
  ): boolean => {
    const result = featureGateManager.checkFeatureAccess(
      action,
      currentTier,
      usage,
      usage.limits,
      options
    );
    
    return result.allowed;
  }, [currentTier, usage]);

  // Simple boolean check for feature access
  const canUseFeature = useCallback((action: FeatureAction): boolean => {
    return checkAccess(action, { showAlert: false });
  }, [checkAccess]);

  // Get remaining quota for a feature
  const getRemainingQuota = useCallback((action: FeatureAction): number => {
    const result = featureGateManager.checkFeatureAccess(
      action,
      currentTier,
      usage,
      usage.limits,
      { showAlert: false }
    );
    
    return result.remainingQuota || 0;
  }, [currentTier, usage]);

  // Use a feature (check access and track usage)
  const useFeature = useCallback(async (
    action: FeatureAction,
    options: FeatureGateOptions = {}
  ): Promise<boolean> => {
    const result = featureGateManager.checkFeatureAccess(
      action,
      currentTier,
      usage,
      usage.limits,
      options
    );

    if (!result.allowed) {
      return false;
    }

    // Track usage for countable features
    const usageMapping: Record<string, keyof typeof usage> = {
      'send_message': 'messagesSent',
      'send_interest': 'interestsSent',
      'view_profile': 'profileViews',
      'perform_search': 'searchesPerformed',
      'boost_profile': 'profileBoosts',
    };

    const usageField = usageMapping[action];
    if (usageField) {
      await trackFeatureUsage(usageField);
    }

    return true;
  }, [currentTier, usage, trackFeatureUsage]);

  // Check if approaching limit (80% threshold)
  const isApproachingLimit = useCallback((action: FeatureAction): boolean => {
    const usageMapping: Record<string, keyof typeof usage> = {
      'send_message': 'messagesSent',
      'send_interest': 'interestsSent',
      'view_profile': 'profileViews',
      'perform_search': 'searchesPerformed',
      'boost_profile': 'profileBoosts',
    };

    const usageField = usageMapping[action];
    if (!usageField) return false;

    const percentage = getUsagePercentage(usageField);
    return percentage >= 80;
  }, [getUsagePercentage]);

  // Get upgrade suggestion for a feature
  const getUpgradeSuggestion = useCallback((action: FeatureAction) => {
    return featureGateManager.getUpgradeSuggestion(action, currentTier);
  }, [currentTier]);

  return {
    checkAccess,
    canUseFeature,
    getRemainingQuota,
    useFeature,
    isApproachingLimit,
    getUpgradeSuggestion,
    currentTier,
    hasActiveSubscription,
    daysUntilExpiry,
  };
}