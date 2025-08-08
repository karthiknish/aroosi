"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
// import { formatDistanceToNow } from 'date-fns';

// Narrow the plan key type so TS knows valid indices
type PlanKey = "free" | "premium" | "premiumPlus";

const planConfig: Record<
  PlanKey,
  {
    name: string;
    color: string;
    features: string[];
    price?: string;
  }
> = {
  free: {
    name: "Free",
    color: "bg-gray-500",
    features: ["Limited messaging", "Basic search", "Profile views"],
  },
  premium: {
    name: "Premium",
    color: "bg-blue-500",
    features: ["Unlimited messaging", "Advanced filters", "Priority support"],
    price: "£14.99/month",
  },
  premiumPlus: {
    name: "Premium Plus",
    color: "bg-purple-500",
    features: [
      "All Premium features",
      "Profile boost (5/month)",
      "Profile viewers",
      "Spotlight badge",
      "Unlimited voice messages",
    ],
    price: "£39.99/month",
  },
};

interface SubscriptionCardProps {
  onUpgrade?: (tier: "premium" | "premiumPlus") => void;
  onCancel?: () => void;
  className?: string;
  token?: string;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  onUpgrade,
  onCancel,
  className,
  token,
}) => {
  // Ensure the hook returns a strongly typed shape so status.plan is a string but we safely narrow later
  const { data: status, isLoading, error } = useSubscriptionStatus(token);

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Failed to load subscription status</p>
        </div>
      </Card>
    );
  }

  if (!status) return null;
  
  // Derive a safe, narrowed key for config lookup using a guarded mapper
  const toPlanKey = (plan: unknown): PlanKey => {
    return plan === "premiumPlus" ? "premiumPlus" : plan === "premium" ? "premium" : "free";
  };
  const planKey = toPlanKey(status.plan as unknown);
  
  const config = planConfig[planKey];
  const isExpiringSoon = status.daysRemaining > 0 && status.daysRemaining <= 7;
  const isTrial = Boolean(status.isTrial);
  const isExpired =
    status.expiresAt && status.expiresAt < Date.now() && status.plan !== "free";

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge className={`${config.color} text-white`}>{config.name}</Badge>
          {/* Spotlight badge visibility depends on a broader profile context; not part of status payload */}
          {/* Show only when plan is premiumPlus for clarity */}
          {planKey === "premiumPlus" && (
            <Badge
              variant="outline"
              className="text-yellow-600 border-yellow-600"
            >
              ✨ Spotlight
            </Badge>
          )}

          {/* Trial badge with countdown when available */}
          {isTrial && (
            <Badge
              variant="outline"
              className="text-emerald-700 border-emerald-600"
              title={
                status.trialEndsAt
                  ? `Ends ${new Date(status.trialEndsAt).toLocaleDateString()}`
                  : undefined
              }
            >
              Trial {Math.max(0, Number(status.trialDaysRemaining ?? 0))}d left
            </Badge>
          )}
        </div>

        {"price" in config && config.price && (
          <span className="text-sm text-gray-600">{config.price}</span>
        )}
      </div>

      {/* Small trial end date line below badges */}
      {isTrial && typeof status.trialEndsAt === "number" && (
        <div className="mb-3 text-xs text-emerald-700">
          Trial ends on {new Date(status.trialEndsAt).toLocaleDateString()}
        </div>
      )}

      {/* Status indicators */}
      {isExpired && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">
            Your subscription has expired
          </p>
        </div>
      )}

      {isTrial && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-emerald-800 text-sm font-medium">
            Trial ends in {status.trialDaysRemaining ?? 0} days
          </p>
        </div>
      )}

      {!isTrial && isExpiringSoon && !isExpired && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium">
            Expires in {status.daysRemaining} days
          </p>
        </div>
      )}

      {/* Subscription details */}
      <div className="space-y-3 mb-6">
        {status.plan !== "free" && status.expiresAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Expires:</span>
            <span className="font-medium">
              {new Date(status.expiresAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* boostsRemaining is not in SubscriptionStatusResponse; omit to fix TS and data mismatch */}
        {planKey === "premiumPlus" && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Premium Plus benefits:</span>
            <span className="font-medium">Includes profile boosts</span>
          </div>
        )}
      </div>

      {/* Features list */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Features:</h4>
        <ul className="space-y-1">
          {config.features.map((feature, index) => (
            <li
              key={index}
              className="text-sm text-gray-600 flex items-center gap-2"
            >
              <span className="text-green-500">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {status.plan === "free" && (
          <>
            <Button
              onClick={() => onUpgrade?.("premium")}
              className="flex-1"
              variant="outline"
            >
              Upgrade to Premium
            </Button>
            <Button
              onClick={() => onUpgrade?.("premiumPlus")}
              className="flex-1"
            >
              Get Premium Plus
            </Button>
          </>
        )}

        {status.plan === "premium" && (
          <>
            <Button
              onClick={() => onUpgrade?.("premiumPlus")}
              className="flex-1"
            >
              Upgrade to Premium Plus
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel Subscription
            </Button>
          </>
        )}

        {status.plan === "premiumPlus" && (
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel Subscription
          </Button>
        )}
      </div>
    </Card>
  );
};
