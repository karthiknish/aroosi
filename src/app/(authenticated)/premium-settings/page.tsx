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
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { updateProfile, boostProfileCookieAuth } from "@/lib/utils/profileApi";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
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
}

export default function PremiumSettingsPage() {
  const { profile: rawProfile, refreshProfile } = useAuthContext();
  const profile = rawProfile as ProfileData;
  const [hideProfile, setHideProfile] = useState<boolean>(
    !!profile?.hideFromFreeUsers,
  );
  const [saving, setSaving] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const router = useRouter();

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
      // Cookie-auth: server reads session cookies
      await updateProfile({
        token: "",
        updates: { hideFromFreeUsers: hideProfile },
      });
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
      // Use cookie-auth; server reads session cookies
      const result = await boostProfileCookieAuth();
      showSuccessToast(
        `Profile boosted for 24 hours! Your profile will appear first in search results. (${result.boostsRemaining ?? 0} boosts left this month)`,
      );
      await refreshProfile();
    } catch (error: unknown) {
      showErrorToast(error, "Boost failed");
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
        : `Boost your profile visibility (${profile.boostsRemaining || 5} remaining this month)`,
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
      description: "Stand out with a premium badge on your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-rose-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.4] bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Premium Settings
            </h1>
            {getSubscriptionBadge(profile.subscriptionPlan as SubscriptionPlan)}
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your premium features and subscription preferences
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
              <Card className="overflow-hidden shadow-lg border-0">
                <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-1">
                  <CardHeader className="bg-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Crown className="w-5 h-5 text-pink-600" />
                      Subscription Status
                    </CardTitle>
                    <CardDescription>
                      Your current plan and subscription details
                    </CardDescription>
                  </CardHeader>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Highlighted current plan badge */}
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2
                        ${profile.subscriptionPlan === "premiumPlus"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-pink-100 text-pink-700"}`}>
                        {profile.subscriptionPlan === "premiumPlus" ? (
                          <Rocket className="w-4 h-4" />
                        ) : (
                          <Crown className="w-4 h-4" />
                        )}
                        {profile.subscriptionPlan === "premium" ? "Premium" : "Premium Plus"}
                      </div>
                      <div className="flex flex-col">
                        {/* Renewal / expiry emphasis */}
                        <span className="text-sm text-gray-700">
                          {profile.subscriptionExpiresAt
                            ? `Renews ${new Date(profile.subscriptionExpiresAt as number).toLocaleDateString()}`
                            : "Active subscription"}
                        </span>
                        {profile.subscriptionExpiresAt && (
                          <span className="text-xs text-gray-500">
                            {(() => {
                              const ms = (profile.subscriptionExpiresAt as number) - Date.now();
                              const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
                              return days > 0 ? `${days} day${days > 1 ? "s" : ""} remaining` : "Renews today";
                            })()}
                          </span>
                        )}
                      </div>
    
                      <div className="mt-4 flex gap-3">
                        {/* Manage billing portal */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { openBillingPortal } = await import("@/lib/utils/stripeUtil");
                              await openBillingPortal();
                            } catch (e) {
                              console.error("Manage billing failed", e);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-md bg-[#BFA67A] px-4 py-2 text-white hover:bg-[#a69063] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#BFA67A]"
                        >
                          Manage billing
                        </button>
                      </div>
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
                      <Button
                        variant="default"
                        onClick={async () => {
                          const { openBillingPortal } = await import("@/lib/utils/stripeUtil");
                          await openBillingPortal();
                        }}
                        className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md"
                        title="Open Stripe Billing Portal"
                      >
                        Billing Portal
                      </Button>
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
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Crown className="w-5 h-5 text-pink-500" />
                    Premium Features
                  </CardTitle>
                  <CardDescription>
                    Features included with your Premium subscription
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
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-full shadow-sm">
                            {feature.icon}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-gray-600">
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Rocket className="w-5 h-5 text-pink-600" />
                    Premium Plus Features
                  </CardTitle>
                  <CardDescription>
                    {isPremiumPlus
                      ? "Exclusive features for Premium Plus subscribers"
                      : "Upgrade to Premium Plus to unlock these features"}
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
                            ? "bg-gradient-to-r from-pink-50 to-rose-50 hover:shadow-md"
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
                            <h3 className="font-medium text-gray-800">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-gray-600">
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
                      className="mt-6 p-6 bg-gradient-to-br from-pink-100 via-rose-100 to-rose-100 rounded-lg"
                    >
                      <p className="text-sm font-semibold text-pink-800 mb-2">
                        Unlock Premium Plus Features
                      </p>
                      <p className="text-sm text-gray-700 mb-4">
                        Get access to advanced features like profile boost,
                        viewer tracking, and premium filters.
                      </p>
                      <Button
                        onClick={() => handleNavigate("/subscription")}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
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
              <Card className="shadow-lg border-0 bg-gradient-to-br from-pink-50 to-rose-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart className="w-5 h-5 text-pink-600" />
                    Usage Tracking
                  </CardTitle>
                  <CardDescription>
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
              <Card className="shadow-lg border-0 bg-gradient-to-br from-pink-50 via-rose-50 to-rose-50">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Premium Benefits
                  </h3>
                  <ul className="space-y-3 text-sm">
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
              <Card className="shadow-lg border-0">
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
  );
}
