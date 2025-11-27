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
    // First day of next month, local time
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
    const interval = setInterval(updateTime, 60000); // Update every minute

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
      // Cookie-auth via central userProfileApi util
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
      // Use central util; surfaces server messages and remaining quota
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
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center">
            <Crown className="w-3 h-3 mr-1" /> Premium
          </Badge>
        );
      case "premiumPlus":
        return (
          <Badge className="bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center">
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
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
      available: true,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <MessageCircle className="w-5 h-5 text-purple-500" />,
      title: "Chat with Matches",
      description: "Start conversations with your matches",
      available: true,
      action: () => handleNavigate("/matches"),
    },
    {
      icon: <Shield className="w-5 h-5 text-pink-500" />,
      title: "Privacy Controls",
      description: "Hide your profile from free users",
      available: true,
      isToggle: true,
    },
    {
      icon: <Users className="w-5 h-5 text-purple-500" />,
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
      icon: <Rocket className="w-5 h-5 text-pink-600" />,
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
      icon: <Eye className="w-5 h-5 text-purple-600" />,
      title: "Profile Viewers",
      description: "See who has viewed your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile/viewers"),
    },
    {
      icon: <Filter className="w-5 h-5 text-pink-600" />,
      title: "Advanced Filters",
      description: "Filter by income, education, and career",
      available: isPremiumPlus,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
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
                showErrorToast(res.message, "Activation failed");
              }
            } catch (e) {
              showErrorToast("Activation failed");
            }
          },
    },
  ];

  return (
    <>

      <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Decorative pink SVG-like blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-[30rem] h-[30rem] rounded-full bg-rose-200/30 blur-3xl" />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-xl md:text-2xl font-semibold leading-tight text-neutral-900">
              Premium Settings
            </h2>
            {getSubscriptionBadge(profile.subscriptionPlan as SubscriptionPlan)}
          </div>
          <p className="text-sm text-neutral-600 max-w-xl mx-auto">
            Manage your premium features and preferences
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden shadow-sm border rounded-lg">
                <CardHeader className="rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="w-5 h-5 text-pink-600" />
                    Subscription Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current plan and subscription details
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Highlighted current plan badge */}
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                          profile.subscriptionPlan === "premiumPlus"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {profile.subscriptionPlan === "premiumPlus" ? (
                          <Rocket className="w-4 h-4" />
                        ) : (
                          <Crown className="w-4 h-4" />
                        )}
                        {profile.subscriptionPlan === "premium"
                          ? "Premium"
                          : "Premium Plus"}
                      </div>
                      <div className="flex flex-col">
                        {/* Renewal / expiry emphasis */}
                        <span className="text-sm text-neutral-700">
                          {profile.subscriptionExpiresAt
                            ? `Renews ${new Date(profile.subscriptionExpiresAt as number).toLocaleDateString()}`
                            : "Active subscription"}
                        </span>
                        {profile.subscriptionExpiresAt && (
                          <span className="text-xs text-neutral-500">
                            {(() => {
                              const ms =
                                (profile.subscriptionExpiresAt as number) -
                                Date.now();
                              const days = Math.max(
                                0,
                                Math.ceil(ms / (1000 * 60 * 60 * 24))
                              );
                              return days > 0
                                ? `${days} day${days > 1 ? "s" : ""} remaining`
                                : "Renews today";
                            })()}
                          </span>
                        )}
                      </div>

                      {/* Removed separate Manage billing placement; moved next to Manage Plan on the right */}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleNavigate("/subscription")}
                        className="border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                        title="Switch plans"
                      >
                        Manage Plan
                      </Button>
                      {/* Manage billing portal (now next to Manage Plan) */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { openBillingPortal } = await import(
                              "@/lib/utils/stripeUtil"
                            );
                            await openBillingPortal();
                          } catch (e) {
                            console.error("Manage billing failed", e);
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-md bg-[#BFA67A] px-4 py-2 text-white hover:bg-[#a69063] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BFA67A]"
                        title="Open billing portal"
                      >
                        Manage billing
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Features */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-sm border rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="w-5 h-5 text-pink-500" />
                    Premium Features
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Features included with your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {premiumFeatures.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-full shadow-sm">
                            {feature.icon}
                          </div>
                          <div>
                            <p className="text-xl text-neutral">
                              {feature.title}
                            </p>
                            <p className="text-sm text-neutral-600">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.isToggle ? (
                            <Switch
                              checked={hideProfile}
                              onCheckedChange={setHideProfile}
                              className="data-[state=checked]:bg-pink-600"
                            />
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={feature.action}
                              className="border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                            >
                              Access
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {hideProfile !== !!profile?.hideFromFreeUsers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4"
                    >
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
                      >
                        {saving ? (
                          <LoadingSpinner size={16} className="mr-2" />
                        ) : null}
                        Save Privacy Settings
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Plus Features */}
            <motion.div
              className="bg-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-sm bg-white border rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Rocket className="w-5 h-5 text-pink-600" />
                    Premium Plus Features
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isPremiumPlus
                      ? "Exclusive for Premium Plus"
                      : "Upgrade to unlock these"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {premiumPlusFeatures.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          feature.available
                            ? "bg-white hover:shadow-md"
                            : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full shadow-sm ${
                              feature.available ? "bg-white" : "bg-gray-100"
                            }`}
                          >
                            {feature.icon}
                          </div>
                          <div>
                            <p className="text-xl text-neutral">
                              {feature.title}
                            </p>
                            <p className="text-sm text-neutral-600">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.available ? (
                            feature.isBoost ? (
                              feature.isBoosted ? (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center gap-1">
                                    <Zap className="h-3 w-3 fill-current" />
                                    Boosted
                                  </Badge>
                                  <Clock className="h-4 w-4 text-gray-500" />
                                </div>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={feature.action}
                                  disabled={
                                    boostLoading ||
                                    (profile.boostsRemaining || 0) <= 0
                                  }
                                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
                                >
                                  {boostLoading ? (
                                    <LoadingSpinner
                                      size={14}
                                      className="mr-1"
                                    />
                                  ) : (
                                    <Rocket className="h-4 w-4 mr-1" />
                                  )}
                                  Boost Now
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={feature.action}
                                className="border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                              >
                                Access
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleNavigate("/subscription")}
                              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
                            >
                              Upgrade
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {!isPremiumPlus && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 p-5 rounded-lg bg-white border"
                    >
                      <p className="text-sm text-neutral-800 mb-3">
                        Unlock Premium Plus features like profile boost, viewer
                        tracking, and premium filters.
                      </p>
                      <Button
                        onClick={() => handleNavigate("/subscription")}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        Upgrade to Premium Plus
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Tracking */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-sm bg-white border rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart className="w-5 h-5 text-pink-600" />
                    Usage Tracking
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitor your feature usage and limits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-800">
                        View Detailed Analytics
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Track messages, searches, profile views, and more
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate("/usage")}
                      className="w-full border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                    >
                      <BarChart className="w-4 h-4 mr-2" />
                      View Usage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Benefits Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-sm border rounded-lg bg-white">
                <CardContent className="p-5">
                  <h3 className="font-medium text-base mb-3 text-neutral-800 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Premium Benefits
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-3">
                      <MessageCircle className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Unlimited messaging with all your matches
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Enhanced privacy controls and settings
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Rocket className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Boost your profile for maximum visibility
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Eye className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        See who&apos;s interested in your profile
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-sm border rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-pink-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => handleNavigate("/subscription")}
                    variant="outline"
                    className="w-full border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                  >
                    Manage Subscription
                  </Button>
                  <Button
                    onClick={() => handleNavigate("/pricing")}
                    variant="outline"
                    className="w-full border-pink-200 hover:bg-pink-50 hover:border-pink-300"
                  >
                    View All Plans
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
