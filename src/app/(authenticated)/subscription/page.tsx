"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { UsageCard } from "@/components/subscription/UsageCard";
import {
  useSubscriptionActions,
  useSubscriptionGuard,
} from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { createCheckoutSession } from "@/lib/utils/stripeUtil";

const pricingPlans = [
  {
    id: "premium",
    name: "Premium",
    price: "£14.99",
    billing: "per month",
    description: "Perfect for active users",
    features: [
      "Unlimited messaging",
      "Advanced search filters",
      "Priority customer support",
      "Enhanced profile visibility",
    ],
    popular: false,
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: "£39.99",
    billing: "per month",
    description: "Maximum visibility and features",
    features: [
      "All Premium features",
      "Profile boost (5 per month)",
      "See who viewed your profile",
      "Spotlight badge",
      "Unlimited voice messages",
      "Priority matching",
    ],
    popular: true,
  },
];

export default function SubscriptionPage() {
  const { token } = useAuthContext();
  const { cancel, restore, isLoading } = useSubscriptionActions(
    token || undefined
  );
  const { status, isPremium, isPremiumPlus } = useSubscriptionGuard(
    token || undefined
  );
  const router = useRouter();

  const handleUpgrade = async (tier: "premium" | "premiumPlus") => {
    // Only allow direct upgrade if on free plan (for trial/admin/testing)
    if (status?.plan === "free") {
      // Use Stripe checkout for paid plans
      const result = await createCheckoutSession(token!, {
        planType: tier,
        successUrl: window.location.origin + "/plans?checkout=success",
        cancelUrl: window.location.origin + "/plans?checkout=cancel",
      });
      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } else {
      // Prevent direct upgrade for paid plans
      alert("Please use the Stripe portal to manage your subscription.");
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
      )
    ) {
      cancel();
    }
  };

  const handleRestore = () => {
    restore();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subscription Management
        </h1>
        <p className="text-gray-600">
          Manage your subscription and view usage statistics
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Current Subscription */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
            <SubscriptionCard
              onUpgrade={handleUpgrade}
              onCancel={handleCancel}
              token={token || undefined}
            />
          </div>

          {/* Usage Statistics */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
            <UsageCard token={token || undefined} />
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={handleRestore}
                variant="outline"
                disabled={isLoading}
              >
                Restore Purchases
              </Button>

              <Button onClick={() => router.push("/pricing")} variant="outline">
                View All Plans
              </Button>

              {isPremium && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  disabled={isLoading}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Upgrade Options */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
            <div className="space-y-4">
              {pricingPlans.map((plan) => {
                const isCurrentPlan = status?.plan === plan.id;
                const canUpgrade =
                  (plan.id === "premium" && !isPremium) ||
                  (plan.id === "premiumPlus" && !isPremiumPlus);

                return (
                  <Card
                    key={plan.id}
                    className={`p-6 relative ${plan.popular ? "border-blue-500" : ""}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                        Most Popular
                      </Badge>
                    )}

                    {isCurrentPlan && (
                      <Badge className="absolute -top-2 right-4 bg-green-500">
                        Current Plan
                      </Badge>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {plan.price}
                        <span className="text-sm font-normal text-gray-600">
                          /{plan.billing}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {plan.description}
                      </p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-center gap-2"
                        >
                          <span className="text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {canUpgrade && (
                      <Button
                        onClick={() =>
                          handleUpgrade(plan.id as "premium" | "premiumPlus")
                        }
                        className="w-full"
                        disabled={isLoading}
                      >
                        Upgrade to {plan.name}
                      </Button>
                    )}

                    {isCurrentPlan && (
                      <div className="text-center text-sm text-green-600 font-medium">
                        ✓ Your current plan
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Benefits Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <h3 className="font-semibold mb-3">Why Upgrade?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">💬</span>
                Send unlimited messages
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">🔍</span>
                Use advanced search filters
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">⭐</span>
                Boost your profile visibility
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">👁️</span>
                See who viewed your profile
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
