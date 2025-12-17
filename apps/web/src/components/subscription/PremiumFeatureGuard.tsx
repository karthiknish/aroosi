'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptionGuard } from '@/hooks/useSubscription';

interface PremiumFeatureGuardProps {
  feature?: string;
  requiredTier?: 'premium' | 'premiumPlus';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgrade?: () => void;
  showUpgradePrompt?: boolean;
}

export const PremiumFeatureGuard: React.FC<PremiumFeatureGuardProps> = ({
  feature,
  requiredTier,
  children,
  fallback,
  onUpgrade,
  showUpgradePrompt = true,
}) => {
  const { canAccess, requiresPremium, requiresPremiumPlus, status } = useSubscriptionGuard();

  // Determine required tier based on feature or explicit tier
  let neededTier: 'premium' | 'premiumPlus' = 'premium';
  
  if (requiredTier) {
    neededTier = requiredTier;
  } else if (feature) {
    if (requiresPremiumPlus(feature)) {
      neededTier = 'premiumPlus';
    } else if (requiresPremium(feature)) {
      neededTier = 'premium';
    }
  }

  const hasAccess = canAccess(neededTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const tierName = neededTier === 'premiumPlus' ? 'Premium Plus' : 'Premium';
  const price = neededTier === 'premiumPlus' ? '£39.99' : '£14.99';

  return (
    <Card className="p-6 text-center bg-gradient-to-br from-info/5 to-primary/5 border-info/20">
      <div className="mb-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-info to-primary rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-neutral mb-2">
          {tierName} Feature
        </h3>
        
        <p className="text-neutral-light mb-4">
          This feature requires a {tierName} subscription to access.
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-neutral-light">
          Current plan: <span className="capitalize font-medium">{status?.plan || 'Free'}</span>
        </div>
        
        <Button
          onClick={onUpgrade ?? (() => (window.location.href = '/plans'))}
          className="w-full bg-gradient-to-r from-info to-primary hover:brightness-95"
        >
          Upgrade to {tierName} - {price}/month
        </Button>
        
        <p className="text-xs text-neutral-light">
          Cancel anytime • 30-day money-back guarantee
        </p>
      </div>
    </Card>
  );
};

interface FeatureLockedProps {
  featureName: string;
  requiredTier: 'premium' | 'premiumPlus';
  onUpgrade?: () => void;
  className?: string;
}

export const FeatureLocked: React.FC<FeatureLockedProps> = ({
  featureName,
  requiredTier,
  onUpgrade,
  className,
}) => {
  const tierName = requiredTier === 'premiumPlus' ? 'Premium Plus' : 'Premium';
  const price = requiredTier === 'premiumPlus' ? '£39.99' : '£14.99';

  return (
    <div className={`bg-neutral/5 border-2 border-dashed border-neutral/10 rounded-lg p-8 text-center ${className}`}>
      <div className="mb-4">
        <svg className="w-12 h-12 mx-auto text-neutral-light mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        
        <h3 className="text-lg font-medium text-neutral mb-2">
          {featureName}
        </h3>
        
        <p className="text-neutral-light mb-4">
          Unlock {featureName.toLowerCase()} with {tierName}
        </p>
      </div>

      <Button
        onClick={onUpgrade ?? (() => (window.location.href = '/plans'))}
        variant="outline"
        className="border-info text-info hover:bg-info/5"
      >
        Upgrade to {tierName} - {price}/month
      </Button>
    </div>
  );
};