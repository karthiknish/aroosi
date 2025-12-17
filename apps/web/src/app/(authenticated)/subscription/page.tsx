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
import { useRouter, useSearchParams } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import CancelSubscriptionButton from "@/components/subscription/CancelSubscriptionButton";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import {
  createCheckoutSession,
  openBillingPortal,
} from "@/lib/utils/stripeUtil";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
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
import { DEFAULT_PLANS } from "@/lib/constants/plans";

const ICON_MAP: Record<string, React.ElementType> = {
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
};

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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Filter out free plan for the upgrade options list
  const paidPlans = DEFAULT_PLANS.filter((p) => p.id !== "free");

  // After returning from Stripe checkout (?checkout=success) aggressively refetch subscription status
  // to reflect plan upgrade without waiting for default staleTime (webhook latency buffer).
  React.useEffect(() => {
    if (!searchParams) return;
    const checkoutState = searchParams.get("checkout");
    if (checkoutState !== "success") return;
    let attempts = 0;
    const maxAttempts = 6; // up to ~12s (6 * 2s)
    const initialPlan = status?.plan || "free";
    const interval = setInterval(() => {
      attempts++;
      // Force refetch
      queryClient.invalidateQueries({ queryKey: ["subscription", "status"] });
      const latest: any = queryClient.getQueryData(["subscription", "status"]);
      const latestPlan = latest?.plan;
      if (latestPlan && latestPlan !== "free" && latestPlan !== initialPlan) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [searchParams, queryClient, status?.plan]);

  const handleUpgrade = async (tier: "premium" | "premiumPlus") => {
    // Only allow direct upgrade if on free plan (for trial/admin/testing)
    if (status?.plan === "free") {
      // Use Stripe checkout for paid plans; cookie-auth on server side
      try {
        const result = await createCheckoutSession("", {
          planType: tier,
          successUrl: window.location.origin + "/subscription?checkout=success",
          cancelUrl: window.location.origin + "/subscription?checkout=cancel",
        } as any);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          showErrorToast(result.error, "Checkout failed. Please try again.");
        }
      } catch (err) {
        showErrorToast(err, "Checkout failed. Please try again.");
      }
    } else {
      // Prevent direct upgrade for paid plans; direct users to billing portal
      showErrorToast(
        "Please use the Billing Portal to manage your subscription."
      );
      // Optional: automatically open billing portal
      // handleManageBilling();
    }
  };

  // If redirected back after checkout success on this page, ask backend to refresh
  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("checkout") === "success") {
      fetch("/api/subscription/refresh", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
  }, []);

  const handleCancel = () => {
    // kept for backward compatibility — SubscriptionCard will call this after local confirmation
    handleConfirmCancel();
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

  const handleConfirmCancel = () => {
    cancel(undefined, {
      onSuccess: (data) => {
        const end =
          typeof data?.accessUntil === "number"
            ? new Date(data.accessUntil)
            : null;
        const endStr = end ? end.toLocaleDateString() : null;
        const baseMsg =
          data.message ||
          "Cancellation requested. Your plan will remain active until the end of the billing period.";
        const msg = endStr ? `${baseMsg} Access ends on ${endStr}.` : baseMsg;
        showSuccessToast(msg);
        try {
          // Nudge status refresh so badges reflect scheduled cancellation immediately
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        } catch {}
      },
      onError: (error) => {
        showErrorToast(error, "Failed to request cancellation");
      },
    });
  };

  return (
    <>
      <div className="min-h-screen bg-base-light">
        <div className="container mx-auto px-4 py-8 max-w-7xl pt-24">
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
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-4 font-serif"
            >
              Subscription Management
            </h1>
            <p className="text-lg text-neutral-light max-w-2xl mx-auto">
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
              <Card className="overflow-hidden shadow-lg border-0 bg-base-light/80 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-primary to-primary-dark p-1">
                  <CardHeader className="bg-base-light rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl font-serif">
                      <Crown className="h-5 w-5 text-primary" />
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
              <Card className="shadow-lg border-0 bg-base-light/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-serif">
                    <Zap className="h-5 w-5 text-secondary" />
                    Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UsageCard />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-lg border-0 bg-base-light/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-serif">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      onClick={handleRestore}
                      variant="outline"
                      disabled={restorePending}
                      className="border-secondary/20 hover:bg-secondary/5 hover:border-secondary/30 transition-colors"
                    >
                      Restore Purchases
                    </Button>

                    <Button
                      onClick={() => router.push("/pricing")}
                      variant="outline"
                      className="border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    >
                      View All Plans
                    </Button>

                    {(isPremium || isPremiumPlus) && (
                      <Button
                        onClick={handleManageBilling}
                        variant="outline"
                        className="border-accent/20 hover:bg-accent/5 hover:border-accent/30 transition-colors"
                        disabled={isLoading}
                      >
                        Manage Billing
                      </Button>
                    )}

                    {(isPremium || isPremiumPlus) && (
                      <CancelSubscriptionButton
                        onConfirm={handleConfirmCancel}
                        className="text-danger border-danger/20 hover:bg-danger/5 hover:border-danger/30 transition-colors sm:col-span-2"
                        isLoading={cancelPending}
                        disabled={cancelPending}
                      />
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
              <h2 className="text-2xl font-bold text-neutral-dark mb-4 font-serif">
                Available Plans
              </h2>

              <div className="space-y-4">
                {paidPlans.map((plan, index) => {
                  const isCurrentPlan = status?.plan === plan.id;
                  const canUpgrade =
                    (plan.id === "premium" && !isPremium && !isPremiumPlus) ||
                    (plan.id === "premiumPlus" && !isPremiumPlus);
                  const Icon = ICON_MAP[plan.iconName || "Star"] || Star;

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Card
                        className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                          plan.popular
                            ? "ring-2 ring-primary ring-offset-2"
                            : ""
                        } ${
                          isCurrentPlan
                            ? "bg-success/5"
                            : "bg-base-light/80 backdrop-blur-sm"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-1 -right-8 bg-gradient-to-r from-primary to-primary-dark text-base-light text-xs font-bold px-8 py-1 transform rotate-12">
                            POPULAR
                          </div>
                        )}

                        {isCurrentPlan &&
                          (status?.cancelAtPeriodEnd && status?.expiresAt ? (
                            <Badge className="absolute top-4 left-4 bg-warning hover:bg-warning/90">
                              <Check className="h-3 w-3 mr-1" />
                              Ends{" "}
                              {new Date(status.expiresAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge className="absolute top-4 left-4 bg-success hover:bg-success/90">
                              <Check className="h-3 w-3 mr-1" />
                              Current Plan
                            </Badge>
                          ))}

                        <CardContent className="p-6">
                          <div className="text-center mb-6">
                            <div
                              className={`inline-flex p-3 rounded-full ${plan.gradient} mb-4`}
                            >
                              <Icon className="h-8 w-8 text-base-light" />
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-dark mb-2 font-serif">
                              {plan.name}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1 mb-2">
                              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                                {(plan.price / 100).toFixed(2)}
                              </span>
                              <span className="text-neutral-light text-sm">
                                /{plan.billing}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-light">
                              {plan.description}
                            </p>
                          </div>

                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, idx) => {
                              const FeatureIcon = Check;
                              return (
                                <li
                                  key={idx}
                                  className="flex items-start gap-3 text-sm"
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <FeatureIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="text-neutral-dark">
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
                              className={`w-full ${plan.gradient} text-base-light hover:opacity-90 transition-opacity`}
                              disabled={upgradePending}
                            >
                              Upgrade to {plan.name}
                            </Button>
                          )}

                          {isCurrentPlan && (
                            <div className="text-center">
                              {status?.cancelAtPeriodEnd &&
                              status?.expiresAt ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-warning/10 text-warning"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Ends{" "}
                                  {new Date(
                                    status.expiresAt
                                  ).toLocaleDateString()}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-success/10 text-success"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
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
                <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4 text-neutral-dark flex items-center gap-2 font-serif">
                      <Heart className="h-5 w-5 text-primary" />
                      Why Upgrade?
                    </h3>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <MessageCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-neutral-dark">
                          Connect with unlimited matches through messaging
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Search className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-neutral-dark">
                          Find your perfect match with advanced filters
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Rocket className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-neutral-dark">
                          Boost your profile to get 10x more visibility
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Eye className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-neutral-dark">
                          Know who&apos;s interested with profile view tracking
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.aside>
          </div>

          {/* Confirmation is handled locally by each cancel button */}
        </div>
      </div>
    </>
  );
}
