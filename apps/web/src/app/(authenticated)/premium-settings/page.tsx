"use client";
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import {
  updateUserProfile,
  boostProfile,
  activateSpotlight,
} from "@/lib/profile/userProfileApi";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { getErrorMessage } from "@/lib/utils/apiResponse";
import {
  Eye,
  Crown,
  Zap,
  Users,
  Filter,
  MessageCircle,
  Heart,
  BarChart,
  Rocket,
  Clock,
  Shield,
  Sparkles,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import type { SubscriptionPlan } from "@/types/profile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

function formatTimeRemaining(boostedUntil: number): string {
  const now = Date.now();
  const timeLeft = boostedUntil - now;

  if (timeLeft <= 0) return "";

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

interface ProfileData {
  hideFromFreeUsers?: boolean;
  boostedUntil?: number;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: number;
  boostsRemaining?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
}

export default function PremiumSettingsPage() {
  const { user, profile: rawProfile, refreshProfile } = useAuthContext();
  const userId =
    user?.uid || (rawProfile as any)?._id || (rawProfile as any)?.userId || "";
  const profile = rawProfile as ProfileData;
  const [hideProfile, setHideProfile] = useState<boolean>(
    !!profile?.hideFromFreeUsers
  );
  const [saving, setSaving] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const router = useRouter();
  const nextMonthlyResetDate = React.useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  }, []);
  const nextResetLabel = React.useMemo(
    () => `Resets on ${nextMonthlyResetDate.toLocaleDateString()}`,
    [nextMonthlyResetDate]
  );

  // Update time remaining every minute when boosted
  useEffect(() => {
    if (!profile?.boostedUntil) return;

    const updateTime = () => {
      if (profile.boostedUntil && profile.boostedUntil > Date.now()) {
        setTimeRemaining(formatTimeRemaining(profile.boostedUntil));
      } else {
        setTimeRemaining("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [profile?.boostedUntil]);

  if (!profile) return null;

  const isPremium =
    profile.subscriptionPlan === "premium" ||
    profile.subscriptionPlan === "premiumPlus";
  const isPremiumPlus = profile.subscriptionPlan === "premiumPlus";

  // Redirect free users
  if (!isPremium) {
    if (typeof window !== "undefined") router.replace("/subscription");
    return null;
  }

  async function handleSave() {
    try {
      setSaving(true);
      const result = await updateUserProfile(userId, {
        hideFromFreeUsers: hideProfile,
      });
      if (!result.success) {
        throw new Error(
          getErrorMessage(result.error) || "Failed to save settings"
        );
      }
      await refreshProfile();
      showSuccessToast("Settings saved successfully");
    } catch (err) {
      console.error(err);
      showErrorToast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleBoost() {
    try {
      setBoostLoading(true);
      const result = await boostProfile(userId);
      if (!result.success) {
        const msg =
          result.message ||
          (profile.subscriptionPlan !== "premiumPlus"
            ? "Requires Premium Plus"
            : (profile.boostsRemaining || 0) <= 0
              ? `No boosts left this month. ${nextResetLabel}`
              : "Boost failed");
        showErrorToast(msg);
      } else {
        const remaining =
          result.boostsRemaining ?? profile.boostsRemaining ?? 0;
        showSuccessToast(
          `Profile boosted for 24 hours! (${remaining} boosts left this month)`
        );
      }
      await refreshProfile();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Boost failed";
      showErrorToast(msg);
    } finally {
      setBoostLoading(false);
    }
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const getSubscriptionBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "premium":
        return (
          <Badge className="bg-gradient-to-r from-primary to-primary-dark text-base-light flex items-center">
            <Crown className="w-3 h-3 mr-1" /> Premium
          </Badge>
        );
      case "premiumPlus":
        return (
          <Badge className="bg-gradient-to-r from-accent to-accent-dark text-base-light flex items-center">
            <Rocket className="w-3 h-3 mr-1" /> Premium Plus
          </Badge>
        );
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  interface Feature {
    icon: React.ReactNode;
    title: string;
    description: string;
    available: boolean;
    action?: () => void;
    isToggle?: boolean;
    isBoost?: boolean;
    isBoosted?: boolean;
  }

  const premiumFeatures: Feature[] = [
    {
      icon: <Heart className="w-5 h-5 text-primary" />,
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
      available: true,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <MessageCircle className="w-5 h-5 text-accent" />,
      title: "Chat with Matches",
      description: "Start conversations with your matches",
      available: true,
      action: () => handleNavigate("/matches"),
    },
    {
      icon: <Shield className="w-5 h-5 text-primary" />,
      title: "Privacy Controls",
      description: "Hide your profile from free users",
      available: true,
      isToggle: true,
    },
    {
      icon: <Users className="w-5 h-5 text-accent" />,
      title: "Daily Match Suggestions",
      description: "Get personalized matches every day",
      available: true,
      action: () => handleNavigate("/search"),
    },
  ];

  const isCurrentlyBoosted =
    profile.boostedUntil && profile.boostedUntil > Date.now();

  const premiumPlusFeatures: Feature[] = [
    {
      icon: <Rocket className="w-5 h-5 text-accent" />,
      title: "Profile Boost",
      description: isCurrentlyBoosted
        ? `Profile is boosted! (${timeRemaining || formatTimeRemaining(profile.boostedUntil!)})`
        : (profile.boostsRemaining || 0) > 0
          ? `Boost your profile visibility (${profile.boostsRemaining} remaining this month)`
          : `No boosts left this month. ${nextResetLabel}`,
      available: isPremiumPlus,
      action: isCurrentlyBoosted ? undefined : handleBoost,
      isBoost: true,
      isBoosted: !!isCurrentlyBoosted,
    },
    {
      icon: <Eye className="w-5 h-5 text-primary" />,
      title: "Profile Viewers",
      description: "See who has viewed your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile/viewers"),
    },
    {
      icon: <Filter className="w-5 h-5 text-accent" />,
      title: "Advanced Filters",
      description: "Filter by income, education, and career",
      available: isPremiumPlus,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Spotlight Badge",
      description:
        profile.hasSpotlightBadge && profile.subscriptionPlan === "premiumPlus"
          ? "Spotlight active"
          : "Stand out with a premium badge on your profile",
      available: isPremiumPlus,
      action: profile.hasSpotlightBadge
        ? () => handleNavigate("/profile")
        : async () => {
            try {
              const res = await activateSpotlight();
              if (res.success) {
                showSuccessToast("Spotlight activated");
                await refreshProfile();
              } else {
                showErrorToast(res.message || "Activation failed");
              }
            } catch (e) {
              showErrorToast("Activation failed");
            }
          },
    },
  ];

  const daysRemaining = profile.subscriptionExpiresAt
    ? Math.max(0, Math.ceil((profile.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-light to-base-dark/20">
      {/* Subtle decorative backgrounds */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-xl ${isPremiumPlus ? "bg-gradient-to-br from-accent to-accent-dark" : "bg-gradient-to-br from-primary to-primary-dark"}`}>
              {isPremiumPlus ? (
                <Sparkles className="w-5 h-5 text-base-light" />
              ) : (
                <Crown className="w-5 h-5 text-base-light" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-neutral-dark">
                Premium Settings
              </h1>
              <p className="text-sm text-neutral-light">
                Manage your subscription and features
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-0 shadow-md bg-base-light">
                <div className={`h-1.5 ${isPremiumPlus ? "bg-gradient-to-r from-accent via-accent-light to-accent" : "bg-gradient-to-r from-primary via-primary-light to-primary"}`} />
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPremiumPlus ? "bg-accent/10" : "bg-primary/10"}`}>
                        {isPremiumPlus ? (
                          <Rocket className="w-6 h-6 text-accent-dark" />
                        ) : (
                          <Crown className="w-6 h-6 text-primary-dark" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-neutral-dark">
                            {isPremiumPlus ? "Premium Plus" : "Premium"}
                          </span>
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${isPremiumPlus ? "bg-accent/10 text-accent-dark border-0" : "bg-primary/10 text-primary-dark border-0"}`}>
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-light">
                          {profile.subscriptionExpiresAt ? (
                            <>
                              Renews {new Date(profile.subscriptionExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <span className="ml-1.5 text-xs text-neutral">
                                  ({daysRemaining} days)
                                </span>
                              )}
                            </>
                          ) : (
                            "Active subscription"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate("/subscription")}
                        className="border-neutral-dark/10 hover:bg-base-dark/50"
                      >
                        Change Plan
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const { openBillingPortal } = await import("@/lib/utils/stripeUtil");
                            await openBillingPortal();
                          } catch (e) {
                            console.error("Manage billing failed", e);
                          }
                        }}
                        className="bg-accent hover:bg-accent-dark text-base-light"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        Billing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-md bg-base-light">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Crown className="w-5 h-5 text-primary" />
                    Premium Features
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-light">
                    Included with your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="divide-y divide-neutral-dark/5">
                    {premiumFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-base-dark/50">
                            {feature.icon}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-dark text-sm">
                              {feature.title}
                            </p>
                            <p className="text-xs text-neutral-light">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.isToggle ? (
                            <Switch
                              checked={hideProfile}
                              onCheckedChange={setHideProfile}
                              className="data-[state=checked]:bg-primary"
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={feature.action}
                              className="text-primary hover:text-primary-dark hover:bg-primary/5"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hideProfile !== !!profile?.hideFromFreeUsers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-neutral-dark/5"
                    >
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-primary hover:bg-primary-dark text-base-light"
                      >
                        {saving && <LoadingSpinner size={16} className="mr-2" />}
                        Save Privacy Settings
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Plus Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-md bg-base-light">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Rocket className="w-5 h-5 text-accent" />
                    Premium Plus Features
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-light">
                    {isPremiumPlus ? "Exclusive features" : "Upgrade to unlock"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="divide-y divide-neutral-dark/5">
                    {premiumPlusFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${!feature.available ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${feature.available ? "bg-accent/10" : "bg-neutral-dark/5"}`}>
                            {feature.icon}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-dark text-sm">
                              {feature.title}
                            </p>
                            <p className="text-xs text-neutral-light">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.available ? (
                            feature.isBoost ? (
                              feature.isBoosted ? (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-gradient-to-r from-primary to-primary-dark text-base-light text-xs">
                                    <Zap className="h-3 w-3 mr-1 fill-current" />
                                    Boosted
                                  </Badge>
                                  <Clock className="h-4 w-4 text-neutral-light" />
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={feature.action}
                                  disabled={boostLoading || (profile.boostsRemaining || 0) <= 0}
                                  className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary-dark text-base-light"
                                >
                                  {boostLoading ? (
                                    <LoadingSpinner size={14} className="mr-1" />
                                  ) : (
                                    <Rocket className="h-4 w-4 mr-1" />
                                  )}
                                  Boost
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={feature.action}
                                className="text-accent hover:text-accent-dark hover:bg-accent/5"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleNavigate("/subscription")}
                              className="bg-accent hover:bg-accent-dark text-base-light"
                            >
                              Upgrade
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isPremiumPlus && (
                    <div className="mt-4 pt-4 border-t border-neutral-dark/5">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                        <p className="text-sm text-neutral-dark mb-3">
                          Unlock profile boosts, viewer tracking, and advanced filters.
                        </p>
                        <Button
                          onClick={() => handleNavigate("/subscription")}
                          className="w-full bg-accent hover:bg-accent-dark text-base-light"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Upgrade to Premium Plus
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Tracking */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-md bg-base-light">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BarChart className="w-5 h-5 text-primary" />
                    Usage Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-light mb-4">
                    Track messages, searches, and profile views.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate("/usage")}
                    className="w-full border-neutral-dark/10 hover:bg-base-dark/50"
                  >
                    <BarChart className="w-4 h-4 mr-2" />
                    View Usage
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Benefits Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-md bg-base-light">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-3 text-neutral-dark flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Your Benefits
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    <li className="flex items-start gap-2.5">
                      <MessageCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-light">Unlimited messaging</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-light">Privacy controls</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Rocket className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-light">Profile visibility boost</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Eye className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-light">See who viewed you</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-md bg-base-light">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => handleNavigate("/subscription")}
                    variant="outline"
                    className="w-full border-neutral-dark/10 hover:bg-base-dark/50 justify-between"
                  >
                    Manage Subscription
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleNavigate("/pricing")}
                    variant="outline"
                    className="w-full border-neutral-dark/10 hover:bg-base-dark/50 justify-between"
                  >
                    View All Plans
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
