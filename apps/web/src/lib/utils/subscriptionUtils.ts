import type { SubscriptionPlan } from "@/types/profile";

export interface SubscriptionFeatures {
  canChatWithMatches: boolean;
  canSendUnlimitedLikes: boolean;
  canViewFullProfiles: boolean;
  canHideFromFreeUsers: boolean;
  canBoostProfile: boolean;
  canViewProfileViewers: boolean;
  canUseAdvancedFilters: boolean;
  hasSpotlightBadge: boolean;
  maxLikesPerDay: number;
  boostsPerMonth: number;
}

export function getSubscriptionFeatures(plan: SubscriptionPlan): SubscriptionFeatures {
  switch (plan) {
    case "free":
      return {
        canChatWithMatches: false,
        canSendUnlimitedLikes: false,
        canViewFullProfiles: false,
        canHideFromFreeUsers: false,
        canBoostProfile: false,
        canViewProfileViewers: false,
        canUseAdvancedFilters: false,
        hasSpotlightBadge: false,
        maxLikesPerDay: 5,
        boostsPerMonth: 0,
      };
    case "premium":
      return {
        canChatWithMatches: true,
        canSendUnlimitedLikes: true,
        canViewFullProfiles: true,
        canHideFromFreeUsers: true,
        canBoostProfile: false,
        canViewProfileViewers: false,
        canUseAdvancedFilters: false,
        hasSpotlightBadge: false,
        maxLikesPerDay: -1, // unlimited
        boostsPerMonth: 0,
      };
    case "premiumPlus":
      return {
        canChatWithMatches: true,
        canSendUnlimitedLikes: true,
        canViewFullProfiles: true,
        canHideFromFreeUsers: true,
        canBoostProfile: true,
        canViewProfileViewers: true,
        canUseAdvancedFilters: true,
        hasSpotlightBadge: true,
        maxLikesPerDay: -1, // unlimited
        boostsPerMonth: 5,
      };
    default:
      return getSubscriptionFeatures("free");
  }
}

export function canAccessFeature(
  userPlan: SubscriptionPlan,
  feature: keyof SubscriptionFeatures
): boolean {
  const features = getSubscriptionFeatures(userPlan);
  return Boolean(features[feature]);
}

export function getUpgradeMessage(
  currentPlan: SubscriptionPlan,
  requiredFeature: keyof SubscriptionFeatures
): string {
  const messages: Record<keyof SubscriptionFeatures, string> = {
    canChatWithMatches: "Upgrade to Premium to chat with your matches",
    canSendUnlimitedLikes: "Upgrade to Premium for unlimited likes",
    canViewFullProfiles: "Upgrade to Premium to view full profile details",
    canHideFromFreeUsers: "Upgrade to Premium to hide your profile from free users",
    canBoostProfile: "Upgrade to Premium Plus to boost your profile",
    canViewProfileViewers: "Upgrade to Premium Plus to see who viewed your profile",
    canUseAdvancedFilters: "Upgrade to Premium Plus for advanced search filters",
    hasSpotlightBadge: "Upgrade to Premium Plus for a spotlight badge",
    maxLikesPerDay: "Upgrade to Premium for unlimited daily likes",
    boostsPerMonth: "Upgrade to Premium Plus for monthly profile boosts",
  };

  return messages[requiredFeature] || "Upgrade your plan to access this feature";
}

export function getRequiredPlanForFeature(feature: keyof SubscriptionFeatures): SubscriptionPlan {
  // Features available to Premium and above
  const premiumFeatures: (keyof SubscriptionFeatures)[] = [
    "canChatWithMatches",
    "canSendUnlimitedLikes", 
    "canViewFullProfiles",
    "canHideFromFreeUsers"
  ];

  // Features only available to Premium Plus
  const premiumPlusFeatures: (keyof SubscriptionFeatures)[] = [
    "canBoostProfile",
    "canViewProfileViewers",
    "canUseAdvancedFilters",
    "hasSpotlightBadge",
    "boostsPerMonth"
  ];

  if (premiumPlusFeatures.includes(feature)) {
    return "premiumPlus";
  } else if (premiumFeatures.includes(feature)) {
    return "premium";
  } else {
    return "free";
  }
}

export function isFeatureAvailable(
  userPlan: SubscriptionPlan,
  feature: keyof SubscriptionFeatures
): { available: boolean; requiredPlan?: SubscriptionPlan; message?: string } {
  const available = canAccessFeature(userPlan, feature);
  
  if (available) {
    return { available: true };
  }

  const requiredPlan = getRequiredPlanForFeature(feature);
  const message = getUpgradeMessage(userPlan, feature);

  return {
    available: false,
    requiredPlan,
    message
  };
}

export function shouldShowUpgradePrompt(
  userPlan: SubscriptionPlan,
  attemptedFeature: keyof SubscriptionFeatures
): boolean {
  return !canAccessFeature(userPlan, attemptedFeature);
}