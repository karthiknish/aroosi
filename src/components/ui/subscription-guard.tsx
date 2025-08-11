import React from "react";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Crown, Zap, Lock } from "lucide-react";
import {
  isFeatureAvailable,
  type SubscriptionFeatures,
} from "@/lib/utils/subscriptionUtils";
import type { SubscriptionPlan } from "@/types/profile";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature: keyof SubscriptionFeatures;
  fallback?: React.ReactNode;
  showUpgradeCard?: boolean;
  className?: string;
}

export function SubscriptionGuard({
  children,
  feature,
  fallback,
  showUpgradeCard = true,
  className = "",
}: SubscriptionGuardProps) {
  const { profile: rawProfile } = useAuthContext();
  const profile = rawProfile as { subscriptionPlan?: SubscriptionPlan } | null;
  console.log("SubscriptionGuard profile:", profile);
  const router = useRouter();

  if (!profile) return null;

  const featureCheck = isFeatureAvailable(profile.subscriptionPlan, feature);
  console.log("SubscriptionGuard featureCheck:", featureCheck);

  if (featureCheck.available) {
    return <div className={className}>{children}</div>;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  if (!showUpgradeCard) {
    return null;
  }

  const handleUpgrade = () => {
    router.push("/plans");
  };

  const getUpgradeCardContent = (requiredPlan: SubscriptionPlan) => {
    switch (requiredPlan) {
      case "premium":
        return {
          icon: <Crown className="w-6 h-6 text-purple-500" />,
          badge: (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Crown className="w-3 h-3 mr-1" />
              Premium Required
            </Badge>
          ),
          title: "Premium Feature",
          description:
            "This feature is available to Premium and Premium Plus subscribers.",
          buttonText: "Upgrade to Premium",
          buttonClass:
            "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
        };
      case "premiumPlus":
        return {
          icon: <Zap className="w-6 h-6 text-orange-500" />,
          badge: (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <Zap className="w-3 h-3 mr-1" />
              Premium Plus Required
            </Badge>
          ),
          title: "Premium Plus Feature",
          description:
            "This exclusive feature is only available to Premium Plus subscribers.",
          buttonText: "Upgrade to Premium Plus",
          buttonClass:
            "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
        };
      default:
        return {
          icon: <Lock className="w-6 h-6 text-gray-500" />,
          badge: <Badge variant="outline">Upgrade Required</Badge>,
          title: "Feature Locked",
          description: "Upgrade your plan to access this feature.",
          buttonText: "View Plans",
          buttonClass: "bg-gray-600 hover:bg-gray-700",
        };
    }
  };

  const cardContent = getUpgradeCardContent(
    featureCheck.requiredPlan || "premium",
  );

  return (
    <div className={className}>
      <Card className="border-2 border-dashed">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">{cardContent.icon}</div>
          <div className="flex justify-center mb-2">{cardContent.badge}</div>
          <CardTitle className="text-lg">{cardContent.title}</CardTitle>
          <CardDescription>
            {featureCheck.message || cardContent.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={handleUpgrade} className={cardContent.buttonClass}>
            {cardContent.buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureButtonProps {
  children: React.ReactNode;
  feature: keyof SubscriptionFeatures;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FeatureButton({
  children,
  feature,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
}: FeatureButtonProps) {
  const { profile: rawProfile } = useAuthContext();
  const profile = rawProfile as { subscriptionPlan?: SubscriptionPlan } | null;
  const router = useRouter();

  if (!profile) return null;

  const featureCheck = isFeatureAvailable(profile.subscriptionPlan, feature);

  const handleClick = () => {
    if (featureCheck.available && onClick) {
      onClick();
    } else if (!featureCheck.available) {
      router.push("/plans");
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={featureCheck.available ? variant : "outline"}
      size={size}
      className={`${className} ${!featureCheck.available ? "border-dashed" : ""}`}
      title={featureCheck.available ? undefined : featureCheck.message}
    >
      {!featureCheck.available && <Lock className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  );
}

interface FeatureBadgeProps {
  plan: SubscriptionPlan;
  className?: string;
}

export function FeatureBadge({ plan, className = "" }: FeatureBadgeProps) {
  switch (plan) {
    case "premium":
      return (
        <Badge
          className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white ${className}`}
        >
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      );
    case "premiumPlus":
      return (
        <Badge
          className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white ${className}`}
        >
          <Zap className="w-3 h-3 mr-1" />
          Premium Plus
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          Free
        </Badge>
      );
  }
}
