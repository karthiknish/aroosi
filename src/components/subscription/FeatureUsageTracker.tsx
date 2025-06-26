'use client';

import React, { useEffect } from 'react';
import { useFeatureUsage } from '@/hooks/useSubscription';

interface FeatureUsageTrackerProps {
  feature: string;
  onLimitReached?: () => void;
  children?: React.ReactNode;
}

export const FeatureUsageTracker: React.FC<FeatureUsageTrackerProps> = ({
  feature,
  onLimitReached,
  children,
}) => {
  const { trackUsage } = useFeatureUsage();

  const handleTrackUsage = async () => {
    try {
      const result = await trackUsage(feature);
      
      // Check if user has reached their limit
      if (result.remainingQuota <= 0 && !result.isUnlimited) {
        onLimitReached?.();
      }
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  };

  // Auto-track usage when component is rendered (for passive tracking)
  useEffect(() => {
    handleTrackUsage();
  }, []);

  return (
    <>
      {children}
    </>
  );
};

interface UsageWarningProps {
  feature: string;
  className?: string;
}

export const UsageWarning: React.FC<UsageWarningProps> = ({
  feature,
  className,
}) => {
  const { getUsage } = useFeatureUsage();
  const usage = getUsage(feature);

  if (!usage || (usage as { isUnlimited?: boolean }).isUnlimited) return null;

  const currentUsage = (usage as { currentUsage?: number }).currentUsage || 0;
  const limit = (usage as { limit?: number }).limit || 1;
  const percentage = (currentUsage / limit) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  if (!isNearLimit) return null;

  return (
    <div className={`p-3 rounded-lg border ${isAtLimit ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${isAtLimit ? 'text-red-600' : 'text-yellow-600'}`}>
          {isAtLimit ? '⚠️' : '⚡'}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${isAtLimit ? 'text-red-800' : 'text-yellow-800'}`}>
            {isAtLimit ? 'Usage Limit Reached' : 'Approaching Usage Limit'}
          </p>
          <p className={`text-xs ${isAtLimit ? 'text-red-600' : 'text-yellow-600'}`}>
            You've used {(usage as { currentUsage?: number }).currentUsage} of {(usage as { limit?: number }).limit} {feature.replace('_', ' ')} this month
          </p>
        </div>
      </div>
    </div>
  );
};

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onBlock?: () => void;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  onBlock,
}) => {
  const { checkLimit, trackUsage } = useFeatureUsage();

  const canUseFeature = checkLimit(feature);

  const handleFeatureUse = () => {
    if (canUseFeature) {
      trackUsage(feature);
    } else {
      onBlock?.();
    }
  };

  if (!canUseFeature) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // Wrap children with usage tracking
  return (
    <div onClick={handleFeatureUse}>
      {children}
    </div>
  );
};