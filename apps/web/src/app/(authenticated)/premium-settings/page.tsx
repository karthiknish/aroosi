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
import { Eye, EyeOff, Crown, Zap, Users, Filter, MessageCircle, Heart } from "lucide-react";
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
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
      case "premiumPlus":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white"><Zap className="w-3 h-3 mr-1" />Premium Plus</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const premiumFeatures = [
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
      available: true,
      action: () => handleNavigate("/search")
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Chat with Matches",
      description: "Start conversations with your matches",
      available: true,
      action: () => handleNavigate("/matches")
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Privacy Controls",
      description: "Hide your profile from free users",
      available: true,
      isToggle: true
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Daily Match Suggestions",
      description: "Get personalized matches every day",
      available: true,
      action: () => handleNavigate("/search")
    }
  ];

  const premiumPlusFeatures = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Profile Boost",
      description: `Boost your profile visibility (${profile.boostsRemaining || 5} remaining this month)`,
      available: isPremiumPlus,
      action: () => handleNavigate("/profile")
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Profile Viewers",
      description: "See who has viewed your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile/viewers")
    },
    {
      icon: <Filter className="w-5 h-5" />,
      title: "Advanced Filters",
      description: "Filter by income, education, and career",
      available: isPremiumPlus,
      action: () => handleNavigate("/search")
    },
    {
      icon: <Crown className="w-5 h-5" />,
      title: "Spotlight Badge",
      description: "Stand out with a premium badge on your profile",
      available: isPremiumPlus,
      action: () => handleNavigate("/profile")
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pt-24 pb-12 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Premium Settings</h1>
          {getSubscriptionBadge(profile.subscriptionPlan)}
        </div>
        <p className="text-gray-600">
          Manage your premium features and subscription preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
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
                  {profile.subscriptionPlan === "premium" ? "Premium Plan" : "Premium Plus Plan"}
                </p>
                <p className="text-sm text-gray-500">
                  {profile.subscriptionExpiresAt 
                    ? `Expires: ${new Date(profile.subscriptionExpiresAt).toLocaleDateString()}`
                    : "Active subscription"
                  }
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

        {/* Premium Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              Premium Features
            </CardTitle>
            <CardDescription>
              Features included with your Premium subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-purple-500">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Premium Plus Features
            </CardTitle>
            <CardDescription>
              {isPremiumPlus 
                ? "Exclusive features for Premium Plus subscribers"
                : "Upgrade to Premium Plus to unlock these features"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {premiumPlusFeatures.map((feature, index) => (
                <div key={index} className={`flex items-center justify-between p-4 border rounded-lg ${
                  !feature.available ? 'opacity-50' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={feature.available ? "text-orange-500" : "text-gray-400"}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
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
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-800 mb-2">
                  Unlock Premium Plus Features
                </p>
                <p className="text-sm text-orange-600 mb-3">
                  Get access to advanced features like profile boost, viewer tracking, and premium filters.
                </p>
                <Button 
                  onClick={() => handleNavigate("/plans")}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
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
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}