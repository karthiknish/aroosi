import type { SubscriptionPlan } from "@/types/profile";

export interface SubscriptionFeatures {
  canViewMatches: boolean;
  canChatWithMatches: boolean;
  canInitiateChat: boolean;
  canSendUnlimitedLikes: boolean;
  canViewFullProfiles: boolean;
  canHideFromFreeUsers: boolean;
  canBoostProfile: boolean;
  canViewProfileViewers: boolean;
  canUseAdvancedFilters: boolean;
  hasSpotlightBadge: boolean;
  canUseIncognitoMode: boolean;
  canAccessPrioritySupport: boolean;
  canSeeReadReceipts: boolean;
  maxLikesPerDay: number;
  boostsPerMonth: number;
}

export function getSubscriptionFeatures(
  plan: SubscriptionPlan | undefined
): SubscriptionFeatures {
  switch (plan) {
    case "free":
      return {
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: false,
        canSendUnlimitedLikes: false,
        canViewFullProfiles: false,
        canHideFromFreeUsers: false,
        canBoostProfile: false,
        canViewProfileViewers: false,
        canUseAdvancedFilters: false,
        hasSpotlightBadge: false,
        canUseIncognitoMode: false,
        canAccessPrioritySupport: false,
        canSeeReadReceipts: false,
        maxLikesPerDay: 5,
        boostsPerMonth: 0,
      };
    case "premium":
      return {
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: true,
        canSendUnlimitedLikes: true,
        canViewFullProfiles: true,
        canHideFromFreeUsers: true,
        canBoostProfile: false,
        canViewProfileViewers: false,
        canUseAdvancedFilters: false,
        hasSpotlightBadge: false,
        canUseIncognitoMode: false,
        canAccessPrioritySupport: true,
        canSeeReadReceipts: true,
        maxLikesPerDay: -1, // unlimited
        boostsPerMonth: 0,
      };
    case "premiumPlus":
      return {
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: true,
        canSendUnlimitedLikes: true,
        canViewFullProfiles: true,
        canHideFromFreeUsers: true,
        canBoostProfile: true,
        canViewProfileViewers: true,
        canUseAdvancedFilters: true,
        hasSpotlightBadge: true,
        canUseIncognitoMode: true,
        canAccessPrioritySupport: true,
        canSeeReadReceipts: true,
        maxLikesPerDay: -1, // unlimited
        boostsPerMonth: 5,
      };
    case undefined:
    default:
      return getSubscriptionFeatures("free");
  }
}

export function canAccessFeature(
  userPlan: SubscriptionPlan | undefined,
  feature: keyof SubscriptionFeatures
): boolean {
  const features = getSubscriptionFeatures(userPlan);
  return Boolean(features[feature]);
}

export function getUpgradeMessage(
  currentPlan: SubscriptionPlan | undefined,
  requiredFeature: keyof SubscriptionFeatures
): string {
  const messages: Record<keyof SubscriptionFeatures, string> = {
    canViewMatches: "Upgrade to Premium to see all your matches",
    canChatWithMatches: "Upgrade to Premium to chat with your matches",
    canInitiateChat: "Upgrade to Premium to initiate chats with your matches",
    canSendUnlimitedLikes: "Upgrade to Premium for unlimited likes",
    canViewFullProfiles: "Upgrade to Premium to view full profile details",
    canHideFromFreeUsers:
      "Upgrade to Premium to hide your profile from free users",
    canBoostProfile: "Upgrade to Premium Plus to boost your profile",
    canViewProfileViewers:
      "Upgrade to Premium Plus to see who viewed your profile",
    canUseAdvancedFilters:
      "Upgrade to Premium Plus for advanced search filters",
    hasSpotlightBadge: "Upgrade to Premium Plus for a spotlight badge",
    maxLikesPerDay: "Upgrade to Premium for unlimited daily likes",
    boostsPerMonth: "Upgrade to Premium Plus for monthly profile boosts",
  };

  return (
    messages[requiredFeature] || "Upgrade your plan to access this feature"
  );
}

export function getRequiredPlanForFeature(
  feature: keyof SubscriptionFeatures
): SubscriptionPlan {
  // Features available to Premium and above
  const premiumFeatures: (keyof SubscriptionFeatures)[] = [
    "canInitiateChat",
    "canSendUnlimitedLikes",
    "canViewFullProfiles",
    "canHideFromFreeUsers",
  ];

  // Features only available to Premium Plus
  const premiumPlusFeatures: (keyof SubscriptionFeatures)[] = [
    "canBoostProfile",
    "canViewProfileViewers",
    "canUseAdvancedFilters",
    "hasSpotlightBadge",
    "boostsPerMonth",
  ];

  // Features available to all plans
  const freeFeatures: (keyof SubscriptionFeatures)[] = [
    "canViewMatches",
    "canChatWithMatches",
  ];

  if (premiumPlusFeatures.includes(feature)) {
    return "premiumPlus";
  } else if (premiumFeatures.includes(feature)) {
    return "premium";
  } else if (freeFeatures.includes(feature)) {
    return "free";
  } else {
    return "free";
  }
}

export function isFeatureAvailable(
  userPlan: SubscriptionPlan | undefined,
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
  userPlan: SubscriptionPlan | undefined,
  attemptedFeature: keyof SubscriptionFeatures
): boolean {
  return !canAccessFeature(userPlan, attemptedFeature);
}