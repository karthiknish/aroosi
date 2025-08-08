"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUsageStats } from "@/hooks/useSubscription";

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  isUnlimited?: boolean;
}

const UsageItem: React.FC<UsageItemProps> = ({
  label,
  current,
  limit,
  isUnlimited,
}) => {
  const percentage = isUnlimited ? 0 : (current / limit) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {isUnlimited ? (
            <Badge
              variant="outline"
              className="text-green-600 border-green-600"
            >
              Unlimited
            </Badge>
          ) : (
            <span
              className={`text-sm ${isAtLimit ? "text-red-600" : isNearLimit ? "text-yellow-600" : "text-gray-600"}`}
            >
              {current}/{limit}
            </span>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <Progress
          value={percentage}
          className={`h-2 ${isAtLimit ? "bg-red-100" : isNearLimit ? "bg-yellow-100" : ""}`}
        />
      )}

      {!isUnlimited && (isNearLimit || isAtLimit) && (
        <div className="flex items-center justify-between text-xs mt-1">
          <p className={isAtLimit ? "text-red-600" : "text-yellow-700"}>
            {isAtLimit ? "Limit reached" : "Approaching limit"}
          </p>
          <button
            type="button"
            className="h-6 px-2 rounded bg-pink-600 hover:bg-pink-700 text-white"
            onClick={() => (window.location.href = "/subscription")}
          >
            Upgrade for higher limits
          </button>
        </div>
      )}
    </div>
  );
};

interface UsageCardProps {
  className?: string;
}

export const UsageCard: React.FC<UsageCardProps> = ({ className }) => {
  const { data: usage, isLoading, error } = useUsageStats();

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load usage statistics</p>
        </div>
      </Card>
    );
  }

  if (!usage) return null;

  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1, 1);
  resetDate.setHours(0, 0, 0, 0);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Usage This Month</h3>
        <Badge variant="outline" className="capitalize">
          {usage.plan}
        </Badge>
      </div>

      <div className="space-y-4">
        <UsageItem
          label="Messages Sent"
          current={usage.messaging.sent}
          limit={usage.messaging.limit}
          isUnlimited={usage.messaging.limit === -1}
        />

        {/* The usage payload does not include a separate 'received' count; mirror 'sent' or remove */}
        <UsageItem
          label="Messages Received"
          current={usage.messaging.sent}
          limit={usage.messaging.limit}
          isUnlimited={usage.messaging.limit === -1}
        />

        <UsageItem
          label="Profile Views"
          current={usage.profileViews.count}
          limit={usage.profileViews.limit}
          isUnlimited={usage.profileViews.limit === -1}
        />

        <UsageItem
          label="Searches Performed"
          current={usage.searches.count}
          limit={usage.searches.limit}
          isUnlimited={usage.searches.limit === -1}
        />

        {usage.plan === "premiumPlus" && (
          <>
            <UsageItem
              label="Profile Boosts Used"
              current={usage.boosts.used}
              limit={usage.boosts.monthlyLimit}
            />
            {/* 'remaining' is not included in SubscriptionUsageResponse; derive it safely */}
            <UsageItem
              label="Profile Boosts Remaining"
              current={Math.max(0, (usage.boosts.monthlyLimit ?? 0) - (usage.boosts.used ?? 0))}
              limit={usage.boosts.monthlyLimit}
            />
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-500">
          Usage resets on {resetDate.toLocaleDateString()}
        </p>
      </div>
    </Card>
  );
};
