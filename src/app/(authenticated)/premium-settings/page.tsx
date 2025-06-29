"use client";
import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/utils/profileApi";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { Eye, Crown, Zap, Users, Filter, MessageCircle, Heart, BarChart } from "lucide-react";
import type { SubscriptionPlan } from "@/types/profile";

export default function PremiumSettingsPage() {
  const { profile, token, refreshProfile } = useAuthContext();
  const [hideProfile, setHideProfile] = useState<boolean>(
    !!profile?.hideFromFreeUsers
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (!profile) return null;

  const isPremium = profile.subscriptionPlan === "premium" || profile.subscriptionPlan === "premiumPlus";
  const isPremiumPlus = profile.subscriptionPlan === "premiumPlus";

  // Redirect free users
  if (!isPremium) {
    if (typeof window !== "undefined") router.replace("/plans");
    return null;
  }

  async function handleSave() {
    try {
      setSaving(true);
      if (!token) throw new Error("No token");
      await updateProfile({
        token,
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

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const getSubscriptionBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "premium":
        return (
          <Badge className="bg-primary text-primary-foreground flex items-center">
            <Crown className="w-3 h-3 mr-1" /> Premium
          </Badge>
        );
      case "premiumPlus":
        return (
          <Badge className="bg-primary-dark text-primary-foreground flex items-center">
            <Zap className="w-3 h-3 mr-1" /> Premium&nbsp;Plus
          </Badge>
        );
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const premiumFeatures = [
    {
      icon: <Heart className="w-5 h-5 text-primary" />,
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
      available: true,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <MessageCircle className="w-5 h-5 text-primary" />,
      title: "Chat with Matches",
      description: "Start conversations with your matches",
      available: true,
      action: () => handleNavigate("/matches"),
    },
    {
      icon: <Eye className="w-5 h-5 text-primary" />,
      title: "Privacy Controls",
      description: "Hide your profile from free users",
      available: true,
      isToggle: true,
    },
    {
      icon: <Users className="w-5 h-5 text-primary" />,
      title: "Daily Match Suggestions",
      description: "Get personalized matches every day",
      available: true,
      action: () => handleNavigate("/search"),
    },
  ];

  const premiumPlusFeatures = [
    {
      icon: <Zap className="w-5 h-5 text-primary-dark" />,
      title: "Profile Boost",
      description: `Boost your profile visibility (${profile.boostsRemaining || 5} remaining this month)`,
      available: isPremiumPlus,
      action: () => handleNavigate("/profile"),
    },
    {
      icon: <Eye className="w-5 h-5 text-primary-dark" />,
      title: "Profile Viewers",
      description: "See who has viewed your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile/viewers"),
    },
    {
      icon: <Filter className="w-5 h-5 text-primary-dark" />,
      title: "Advanced Filters",
      description: "Filter by income, education, and career",
      available: isPremiumPlus,
      action: () => handleNavigate("/search"),
    },
    {
      icon: <Crown className="w-5 h-5 text-primary-dark" />,
      title: "Spotlight Badge",
      description: "Stand out with a premium badge on your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile"),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pt-24 pb-12 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Premium Settings</h1>
          {getSubscriptionBadge(profile.subscriptionPlan as SubscriptionPlan)}
        </div>
        <p className="text-muted-foreground">
          Manage your premium features and subscription preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Subscription Status */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Subscription Status
            </CardTitle>
            <CardDescription>
              Your current plan and subscription details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {profile.subscriptionPlan === "premium"
                    ? "Premium Plan"
                    : "Premium Plus Plan"}
                </p>
                <p className="text-sm text-gray-500">
                  {profile.subscriptionExpiresAt
                    ? `Expires: ${new Date(profile.subscriptionExpiresAt as number).toLocaleDateString()}`
                    : "Active subscription"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleNavigate("/plans")}
              >
                Manage Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Tracking */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-primary-light" />
              Usage Tracking
            </CardTitle>
            <CardDescription>
              Monitor your feature usage and limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">View Detailed Usage Analytics</p>
                <p className="text-sm text-gray-500">
                  Track messages, searches, profile views, and more
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleNavigate("/usage")}
                className="flex items-center gap-2"
              >
                <BarChart className="w-4 h-4" />
                View Usage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Premium Features
            </CardTitle>
            <CardDescription>
              Features included with your Premium subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {premiumFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-primary/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{feature.icon}</div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {feature.isToggle ? (
                      <Switch
                        checked={hideProfile}
                        onCheckedChange={setHideProfile}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={feature.action}
                      >
                        Access
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Premium Plus Features */}
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-dark" />
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
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 border border-primary/10 rounded-lg ${
                    !feature.available ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        feature.available
                          ? "text-primary-dark"
                          : "text-gray-400"
                      }
                    >
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {feature.available ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={feature.action}
                      >
                        Access
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleNavigate("/plans")}
                      >
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!isPremiumPlus && (
              <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg">
                <p className="text-sm font-medium text-primary-800 mb-2">
                  Unlock Premium Plus Features
                </p>
                <p className="text-sm text-primary-600 mb-3">
                  Get access to advanced features like profile boost, viewer
                  tracking, and premium filters.
                </p>
                <Button
                  onClick={() => handleNavigate("/plans")}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  Upgrade to Premium Plus
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Changes */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}