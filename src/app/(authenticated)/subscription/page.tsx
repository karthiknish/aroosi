"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { UsageCard } from "@/components/subscription/UsageCard";
import {
  useSubscriptionActions,
  useSubscriptionGuard,
} from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import {
  createCheckoutSession,
  openBillingPortal,
} from "@/lib/utils/stripeUtil";
import { motion } from "framer-motion";
import {
  Crown,
  Zap,
  Shield,
  MessageCircle,
  Search,
  Eye,
  Rocket,
  Check,
  Sparkles,
  Heart,
  Star,
} from "lucide-react";

const pricingPlans = [
  {
    id: "premium",
    name: "Premium",
    price: "£14.99",
    billing: "per month",
    description: "Perfect for active users",
    icon: Crown,
    gradient: "bg-gradient-to-br from-purple-600 to-pink-600",
    features: [
      { icon: MessageCircle, text: "Unlimited messaging" },
      { icon: Search, text: "Advanced search filters" },
      { icon: Shield, text: "Priority customer support" },
      { icon: Zap, text: "Enhanced profile visibility" },
    ],
    popular: false,
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: "£39.99",
    billing: "per month",
    description: "Maximum visibility and features",
    icon: Rocket,
    gradient: "bg-gradient-to-br from-pink-600 to-rose-600",
    features: [
      { icon: Crown, text: "All Premium features" },
      { icon: Rocket, text: "Profile boost (5 per month)" },
      { icon: Eye, text: "See who viewed your profile" },
      { icon: Star, text: "Spotlight badge" },
      { icon: MessageCircle, text: "Unlimited voice messages" },
      { icon: Heart, text: "Priority matching" },
    ],
    popular: true,
  },
];

export default function SubscriptionPage() {
  useAuthContext(); // maintain hook order; no token usage under cookie-auth
  const {
    cancel,
    restore,
    isLoading,
    cancelPending,
    restorePending,
    upgradePending,
  } = useSubscriptionActions();
  const { status, isPremium, isPremiumPlus } = useSubscriptionGuard();
  const router = useRouter();

  const handleUpgrade = async (tier: "premium" | "premiumPlus") => {
    // Only allow direct upgrade if on free plan (for trial/admin/testing)
    if (status?.plan === "free") {
      // Use Stripe checkout for paid plans; cookie-auth on server side
      try {
        const result = await createCheckoutSession("", {
          planType: tier,
          successUrl: window.location.origin + "/plans?checkout=success",
          cancelUrl: window.location.origin + "/plans?checkout=cancel",
        } as any);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          showErrorToast(result.error || "Checkout failed. Please try again.");
        }
      } catch (err) {
        showErrorToast(err, "Checkout failed. Please try again.");
      }
    } else {
      // Prevent direct upgrade for paid plans; direct users to billing portal
      showErrorToast(
        "Please use the Billing Portal to manage your subscription."
      );
    }
  };

  const handleCancel = () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
      )
    ) {
      cancel(undefined, {
        onSuccess: (data) => {
          showSuccessToast(
            data.message ||
              "Cancellation requested. Your plan will remain active until the end of the billing period."
          );
        },
        onError: (error) => {
          showErrorToast(error, "Failed to request cancellation");
        },
      });
    }
  };

  const handleRestore = () => {
    restore(undefined, {
      onSuccess: (data) => {
        showSuccessToast(
          data.message ||
            "Restore requested. We’ll refresh your subscription shortly."
        );
      },
      onError: (error) => {
        showErrorToast(error, "Failed to restore purchases");
      },
    });
  };

  const handleManageBilling = async () => {
    try {
      await openBillingPortal();
    } catch (err) {
      showErrorToast(err, "Failed to open billing portal");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1
            style={{
              lineHeight: "1.7",
            }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Subscription Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock premium features and find your perfect match faster
          </p>
        </motion.div>

        <div className="grid gap-8 xl:grid-cols-3">
          {/* Primary Content: Current Subscription & Usage */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 xl:col-span-2 order-2 xl:order-1"
          >
            {/* Current Subscription Card */}
            <Card className="overflow-hidden shadow-lg border-0">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-1">
                <CardHeader className="bg-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Crown className="h-5 w-5 text-pink-500" />
                    Current Subscription
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                <SubscriptionCard
                  onUpgrade={handleUpgrade}
                  onCancel={handleCancel}
                />
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Zap className="h-5 w-5 text-purple-500" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UsageCard />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={handleRestore}
                    variant="outline"
                    disabled={restorePending}
                    className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  >
                    Restore Purchases
                  </Button>

                  <Button
                    onClick={() => router.push("/pricing")}
                    variant="outline"
                    className="border-pink-200 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                  >
                    View All Plans
                  </Button>

                  {(isPremium || isPremiumPlus) && (
                    <Button
                      onClick={handleManageBilling}
                      variant="outline"
                      className="border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                      disabled={isLoading}
                    >
                      Manage Billing
                    </Button>
                  )}

                  {(isPremium || isPremiumPlus) && (
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors sm:col-span-2"
                      disabled={cancelPending}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Secondary Sidebar: Upgrade Options */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 order-1 xl:order-2 xl:sticky xl:top-6 self-start"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Available Plans
            </h2>

            <div className="space-y-4">
              {pricingPlans.map((plan, index) => {
                const isCurrentPlan = status?.plan === plan.id;
                const canUpgrade =
                  (plan.id === "premium" && !isPremium && !isPremiumPlus) ||
                  (plan.id === "premiumPlus" && !isPremiumPlus);
                const Icon = plan.icon;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Card
                      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                        plan.popular ? "ring-2 ring-pink-500 ring-offset-2" : ""
                      } ${isCurrentPlan ? "bg-gradient-to-br from-green-50 to-emerald-50" : ""}`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-1 -right-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-8 py-1 transform rotate-12">
                          POPULAR
                        </div>
                      )}

                      {isCurrentPlan && (
                        <Badge className="absolute top-4 left-4 bg-green-500 hover:bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Current Plan
                        </Badge>
                      )}

                      <CardContent className="p-6">
                        <div className="text-center mb-6">
                          <div
                            className={`inline-flex p-3 rounded-full ${plan.gradient} mb-4`}
                          >
                            <Icon className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            {plan.name}
                          </h3>
                          <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                              {plan.price}
                            </span>
                            <span className="text-gray-500 text-sm">
                              /{plan.billing}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {plan.description}
                          </p>
                        </div>

                        <ul className="space-y-3 mb-6">
                          {plan.features.map((feature, idx) => {
                            const FeatureIcon = feature.icon;
                            return (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-sm"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  <FeatureIcon className="h-4 w-4 text-pink-500" />
                                </div>
                                <span className="text-gray-700">
                                  {feature.text}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {canUpgrade && (
                          <Button
                            onClick={() =>
                              handleUpgrade(
                                plan.id as "premium" | "premiumPlus"
                              )
                            }
                            className={`w-full ${plan.gradient} text-white hover:opacity-90 transition-opacity`}
                            disabled={upgradePending}
                          >
                            Upgrade to {plan.name}
                          </Button>
                        )}

                        {isCurrentPlan && (
                          <div className="text-center">
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Benefits Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Why Upgrade?
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <MessageCircle className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Connect with unlimited matches through messaging
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Search className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Find your perfect match with advanced filters
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Rocket className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Boost your profile to get 10x more visibility
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Eye className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Know who&apos;s interested with profile view tracking
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
