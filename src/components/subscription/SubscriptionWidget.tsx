'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionGuard } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

interface SubscriptionWidgetProps {
  className?: string;
  compact?: boolean;
}

export const SubscriptionWidget: React.FC<SubscriptionWidgetProps> = ({
  className,
  compact = false,
}) => {
  const router = useRouter();
  const { status, isActive } = useSubscriptionGuard();

  if (!status) return null;

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  const handleManage = () => {
    router.push('/subscription');
  };

  const getPlanConfig = () => {
    switch (status.plan) {
      case 'free':
        return {
          name: 'Free',
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      case 'premium':
        return {
          name: 'Premium',
          color: 'bg-blue-500',
          textColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'premiumPlus':
        return {
          name: 'Premium Plus',
          color: 'bg-purple-500',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
        };
      default:
        return {
          name: 'Unknown',
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getPlanConfig();
  const isExpiringSoon = status.daysRemaining > 0 && status.daysRemaining <= 7;

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor} ${config.borderColor} border ${className}`}>
        <div className="flex items-center gap-2">
          <Badge className={`${config.color} text-white text-xs`}>
            {config.name}
          </Badge>
          {/* Spotlight badge presence is not part of SubscriptionStatusResponse; show for Plus by convention */}
          {status.plan === 'premiumPlus' && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
              ✨
            </Badge>
          )}
          {isExpiringSoon && (
            <span className="text-xs text-yellow-600 font-medium">
              Expires in {status.daysRemaining} days
            </span>
          )}
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={status.plan === 'free' ? handleUpgrade : handleManage}
          className={`text-xs ${config.textColor} border-current hover:bg-current hover:text-white`}
        >
          {status.plan === 'free' ? 'Upgrade' : 'Manage'}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={`${config.color} text-white`}>
            {config.name}
          </Badge>
          {/* Spotlight indicator derived from plan (not part of status payload) */}
          {status.plan === 'premiumPlus' && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              ✨ Spotlight
            </Badge>
          )}
        </div>
        
        {status.plan !== 'free' && status.expiresAt && (
          <span className="text-sm text-gray-600">
            {status.daysRemaining > 0 ? `${status.daysRemaining} days left` : 'Expired'}
          </span>
        )}
      </div>

      {status.plan === 'free' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Unlock premium features like unlimited messaging, profile boost, and more.
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="flex-1"
            >
              Upgrade to Premium
            </Button>
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              variant="outline"
              className="flex-1"
            >
              View Plans
            </Button>
          </div>
        </div>
      )}

      {status.plan === 'premium' && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Status:</span>
            <span className={isActive ? 'text-green-600' : 'text-red-600'}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {isExpiringSoon && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Your subscription expires in {status.daysRemaining} days
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => router.push('/subscription')}
              variant="outline"
              className="flex-1"
            >
              Upgrade to Plus
            </Button>
            <Button 
              size="sm" 
              onClick={handleManage}
              variant="outline"
              className="flex-1"
            >
              Manage
            </Button>
          </div>
        </div>
      )}

      {status.plan === 'premiumPlus' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isActive ? 'text-green-600' : 'text-red-600'}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {/* boostsRemaining is not part of SubscriptionStatusResponse; remove to keep types and data aligned */}
            <div className="flex justify-between">
              <span>Benefits:</span>
              <span className="font-medium">Includes profile boosts</span>
            </div>
          </div>
          
          {isExpiringSoon && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Your subscription expires in {status.daysRemaining} days
            </div>
          )}
          
          <Button 
            size="sm" 
            onClick={handleManage}
            variant="outline"
            className="w-full"
          >
            Manage Subscription
          </Button>
        </div>
      )}
    </Card>
  );
};