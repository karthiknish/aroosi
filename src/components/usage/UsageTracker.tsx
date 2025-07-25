"use client";

import React from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { useUsageStats } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Eye,
  Search,
  Heart,
  Zap,
  Mic,
  Infinity,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const featureIcons: Record<string, React.ReactNode> = {
  message_sent: <MessageSquare className="h-5 w-5" />,
  profile_view: <Eye className="h-5 w-5" />,
  search_performed: <Search className="h-5 w-5" />,
  interest_sent: <Heart className="h-5 w-5" />,
  profile_boost_used: <Zap className="h-5 w-5" />,
  voice_message_sent: <Mic className="h-5 w-5" />,
};

const featureNames: Record<string, string> = {
  message_sent: "Messages Sent",
  profile_view: "Profile Views",
  search_performed: "Searches",
  interest_sent: "Interests Sent",
  profile_boost_used: "Profile Boosts",
  voice_message_sent: "Voice Messages",
};

interface UsageFeature {
  name: string;
  used: number;
  limit: number;
  unlimited: boolean;
  remaining: number;
  percentageUsed: number;
}

interface UsageSummary {
  plan: string;
  currentMonth: string;
  resetDate: number;
  features: UsageFeature[];
}

export function UsageTracker() {
  const { token } = useAuthContext();

  const {
    data: usageRaw,
    isLoading,
    error,
  } = useUsageStats(token ?? undefined);

  const usage = usageRaw as unknown as UsageSummary | undefined;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load usage data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planColors = {
    free: "bg-gray-100 text-gray-800",
    premium: "bg-blue-100 text-blue-800",
    premiumPlus: "bg-purple-100 text-purple-800",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Usage Tracker</CardTitle>
          <Badge
            className={
              planColors[usage.plan as keyof typeof planColors] ||
              planColors.free
            }
          >
            {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} Plan
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          Resets on{" "}
          {usage ? format(new Date(usage.resetDate), "MMMM d, yyyy") : "-"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {usage.features.map((feature: UsageFeature) => (
            <div key={feature.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {featureIcons[feature.name]}
                  <span className="font-medium">
                    {featureNames[feature.name] || feature.name}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {feature.unlimited ? (
                    <div className="flex items-center gap-1">
                      <Infinity className="h-4 w-4" />
                      <span>Unlimited</span>
                    </div>
                  ) : (
                    <span>
                      {feature.used} / {feature.limit}
                    </span>
                  )}
                </div>
              </div>
              {!feature.unlimited && (
                <Progress
                  value={feature.percentageUsed}
                  className={`h-2 ${
                    feature.percentageUsed >= 90
                      ? "bg-red-100"
                      : feature.percentageUsed >= 70
                        ? "bg-yellow-100"
                        : "bg-gray-100"
                  }`}
                />
              )}
              {!feature.unlimited && feature.percentageUsed >= 90 && (
                <p className="text-xs text-red-600">
                  {feature.remaining === 0
                    ? "Limit reached"
                    : `Only ${feature.remaining} remaining`}
                </p>
              )}
            </div>
          ))}
        </div>

        {usage.plan === "free" && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              Upgrade to Premium for unlimited messaging and more features!
            </p>
            <Link href="/pricing">
              <Button size="sm" className="w-full">
                View Premium Plans
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}