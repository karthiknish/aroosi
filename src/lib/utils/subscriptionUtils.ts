import type { SubscriptionPlan } from "@/types/profile";

export interface SubscriptionFeatures {
  // Basic features
  canViewMatches: boolean;
  canChatWithMatches: boolean;
  canInitiateChat: boolean;

  // Communication features
  canSendUnlimitedLikes: boolean;
  maxLikesPerDay: number;
  canSendUnlimitedMessages: boolean;
  maxMessagesPerMonth: number;
  canSendVoiceMessages: boolean;
  maxVoiceMessagesPerMonth: number;

  // Profile features
  canViewFullProfiles: boolean;
  canViewProfileViewers: boolean;
  canHideFromFreeUsers: boolean;
  canBoostProfile: boolean;
  boostsPerMonth: number;
  hasSpotlightBadge: boolean;

  // Search features
  canUseAdvancedFilters: boolean;
  maxSearchesPerDay: number;
  maxProfileViewsPerDay: number;

  // Premium features
  canSeeReadReceipts: boolean;
  canUseIncognitoMode: boolean;
  canAccessPrioritySupport: boolean;
  canSeeWhoLikedMe: boolean;
  canSendInterests: boolean;
  maxInterestsPerMonth: number;
}

export function getSubscriptionFeatures(
  plan: SubscriptionPlan | undefined
): SubscriptionFeatures {
  switch (plan) {
    case "free":
      return {
        // Basic features
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: false,

        // Communication features
        canSendUnlimitedLikes: false,
        maxLikesPerDay: 5,
        canSendUnlimitedMessages: false,
        maxMessagesPerMonth: 5,
        canSendVoiceMessages: false,
        maxVoiceMessagesPerMonth: 0,

        // Profile features
        canViewFullProfiles: false,
        canViewProfileViewers: false,
        canHideFromFreeUsers: false,
        canBoostProfile: false,
        boostsPerMonth: 0,
        hasSpotlightBadge: false,

        // Search features
        canUseAdvancedFilters: false,
        maxSearchesPerDay: 20,
        maxProfileViewsPerDay: 10,

        // Premium features
        canSeeReadReceipts: false,
        canUseIncognitoMode: false,
        canAccessPrioritySupport: false,
        canSeeWhoLikedMe: false,
        canSendInterests: true,
        maxInterestsPerMonth: 3,
      };
    case "premium":
      return {
        // Basic features
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: true,

        // Communication features
        canSendUnlimitedLikes: true,
        maxLikesPerDay: -1, // unlimited
        canSendUnlimitedMessages: true,
        maxMessagesPerMonth: -1, // unlimited
        canSendVoiceMessages: true,
        maxVoiceMessagesPerMonth: 10,

        // Profile features
        canViewFullProfiles: true,
        canViewProfileViewers: true,
        canHideFromFreeUsers: true,
        canBoostProfile: true,
        boostsPerMonth: 1,
        hasSpotlightBadge: false,

        // Search features
        canUseAdvancedFilters: true,
        maxSearchesPerDay: 50,
        maxProfileViewsPerDay: 50,

        // Premium features
        canSeeReadReceipts: true,
        canUseIncognitoMode: false,
        canAccessPrioritySupport: true,
        canSeeWhoLikedMe: false,
        canSendInterests: true,
        maxInterestsPerMonth: -1, // unlimited
      };
    case "premiumPlus":
      return {
        // Basic features
        canViewMatches: true,
        canChatWithMatches: true,
        canInitiateChat: true,

        // Communication features
        canSendUnlimitedLikes: true,
        maxLikesPerDay: -1, // unlimited
        canSendUnlimitedMessages: true,
        maxMessagesPerMonth: -1, // unlimited
        canSendVoiceMessages: true,
        maxVoiceMessagesPerMonth: -1, // unlimited

        // Profile features
        canViewFullProfiles: true,
        canViewProfileViewers: true,
        canHideFromFreeUsers: true,
        canBoostProfile: true,
        boostsPerMonth: -1, // unlimited
        hasSpotlightBadge: true,

        // Search features
        canUseAdvancedFilters: true,
        maxSearchesPerDay: -1, // unlimited
        maxProfileViewsPerDay: -1, // unlimited

        // Premium features
        canSeeReadReceipts: true,
        canUseIncognitoMode: true,
        canAccessPrioritySupport: true,
        canSeeWhoLikedMe: true,
        canSendInterests: true,
        maxInterestsPerMonth: -1, // unlimited
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
    canViewMatches: "Sign up to see all your matches",
    canChatWithMatches: "Sign up to chat with your matches",
    canInitiateChat: "Upgrade to Premium to initiate chats with your matches",
    canSendUnlimitedLikes: "Upgrade to Premium for unlimited likes",
    maxLikesPerDay: "Upgrade to Premium for unlimited daily likes",
    canSendUnlimitedMessages: "Upgrade to Premium for unlimited messaging",
    maxMessagesPerMonth: "Upgrade to Premium for unlimited messages",
    canSendVoiceMessages: "Upgrade to Premium to send voice messages",
    maxVoiceMessagesPerMonth: "Upgrade to Premium for more voice messages",
    canViewFullProfiles: "Upgrade to Premium to view full profile details",
    canViewProfileViewers: "Upgrade to Premium to see who viewed your profile",
    canHideFromFreeUsers:
      "Upgrade to Premium to hide your profile from free users",
    canBoostProfile: "Upgrade to Premium Plus for unlimited profile boosts",
    boostsPerMonth: "Upgrade to Premium Plus for more profile boosts",
    hasSpotlightBadge: "Upgrade to Premium Plus for a spotlight badge",
    canUseAdvancedFilters: "Upgrade to Premium for advanced search filters",
    maxSearchesPerDay: "Upgrade to Premium for more daily searches",
    maxProfileViewsPerDay: "Upgrade to Premium for more daily profile views",
    canSeeReadReceipts: "Upgrade to Premium to see read receipts",
    canUseIncognitoMode: "Upgrade to Premium Plus for incognito mode",
    canAccessPrioritySupport: "Upgrade to Premium for priority support",
    canSeeWhoLikedMe: "Upgrade to Premium Plus to see who liked you",
    canSendInterests: "Sign up to send interests to other users",
    maxInterestsPerMonth: "Upgrade to Premium for unlimited interests",
  };

  return (
    messages[requiredFeature] || "Upgrade your plan to access this feature"
  );
}

export function getRequiredPlanForFeature(
  feature: keyof SubscriptionFeatures
): SubscriptionPlan {
  // Features available to Premium Plus only
  const premiumPlusFeatures: (keyof SubscriptionFeatures)[] = [
    "canBoostProfile",
    "boostsPerMonth",
    "hasSpotlightBadge",
    "canUseIncognitoMode",
    "canSeeWhoLikedMe",
  ];

  // Features available to Premium and above
  const premiumFeatures: (keyof SubscriptionFeatures)[] = [
    "canInitiateChat",
    "canSendUnlimitedLikes",
    "maxLikesPerDay",
    "canSendUnlimitedMessages",
    "maxMessagesPerMonth",
    "canSendVoiceMessages",
    "maxVoiceMessagesPerMonth",
    "canViewFullProfiles",
    "canViewProfileViewers",
    "canHideFromFreeUsers",
    "canUseAdvancedFilters",
    "maxSearchesPerDay",
    "maxProfileViewsPerDay",
    "canSeeReadReceipts",
    "canAccessPrioritySupport",
    "maxInterestsPerMonth",
  ];

  // Features available to all plans
  const freeFeatures: (keyof SubscriptionFeatures)[] = [
    "canViewMatches",
    "canChatWithMatches",
    "canSendInterests",
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
    message,
  };
}

export function shouldShowUpgradePrompt(
  userPlan: SubscriptionPlan | undefined,
  attemptedFeature: keyof SubscriptionFeatures
): boolean {
  return !canAccessFeature(userPlan, attemptedFeature);
}

// New feature gating system aligned with mobile
export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  remainingQuota?: number;
  upgradeRequired?: boolean;
  showUpgradePrompt?: boolean;
}

export interface FeatureGateOptions {
  showAlert?: boolean;
  customMessage?: string;
}

export class FeatureGateManager {
  /**
   * Check if a feature action is allowed based on usage limits
   */
  checkFeatureAccess(
    feature: keyof SubscriptionFeatures,
    currentPlan: SubscriptionPlan | undefined,
    currentUsage: {
      messagesSentThisMonth?: number;
      profileViewsToday?: number;
      searchesToday?: number;
      interestsSentThisMonth?: number;
      boostsUsedThisMonth?: number;
      voiceMessagesSentThisMonth?: number;
    } = {},
    _options: FeatureGateOptions = {}
  ): FeatureGateResult {
    const features = getSubscriptionFeatures(currentPlan);

    // Check if feature is available at plan level
    if (!features[feature]) {
      return {
        allowed: false,
        reason: this.getFeatureNotAvailableMessage(feature, currentPlan),
        upgradeRequired: true,
        showUpgradePrompt: true,
      };
    }

    // Check usage limits for specific features
    switch (feature) {
      case "maxMessagesPerMonth":
        if (features.maxMessagesPerMonth === -1) {
          return { allowed: true };
        }
        const messagesUsed = currentUsage.messagesSentThisMonth || 0;
        const messagesRemaining = features.maxMessagesPerMonth - messagesUsed;
        if (messagesRemaining > 0) {
          return { allowed: true, remainingQuota: messagesRemaining };
        }
        return {
          allowed: false,
          reason: "You've reached your monthly message limit",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      case "maxProfileViewsPerDay":
        if (features.maxProfileViewsPerDay === -1) {
          return { allowed: true };
        }
        const viewsUsed = currentUsage.profileViewsToday || 0;
        const viewsRemaining = features.maxProfileViewsPerDay - viewsUsed;
        if (viewsRemaining > 0) {
          return { allowed: true, remainingQuota: viewsRemaining };
        }
        return {
          allowed: false,
          reason: "You've reached your daily profile view limit",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      case "maxSearchesPerDay":
        if (features.maxSearchesPerDay === -1) {
          return { allowed: true };
        }
        const searchesUsed = currentUsage.searchesToday || 0;
        const searchesRemaining = features.maxSearchesPerDay - searchesUsed;
        if (searchesRemaining > 0) {
          return { allowed: true, remainingQuota: searchesRemaining };
        }
        return {
          allowed: false,
          reason: "You've reached your daily search limit",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      case "maxInterestsPerMonth":
        if (features.maxInterestsPerMonth === -1) {
          return { allowed: true };
        }
        const interestsUsed = currentUsage.interestsSentThisMonth || 0;
        const interestsRemaining =
          features.maxInterestsPerMonth - interestsUsed;
        if (interestsRemaining > 0) {
          return { allowed: true, remainingQuota: interestsRemaining };
        }
        return {
          allowed: false,
          reason: "You've reached your monthly interest limit",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      case "boostsPerMonth":
        if (features.boostsPerMonth === -1) {
          return { allowed: true };
        }
        const boostsUsed = currentUsage.boostsUsedThisMonth || 0;
        const boostsRemaining = features.boostsPerMonth - boostsUsed;
        if (boostsRemaining > 0) {
          return { allowed: true, remainingQuota: boostsRemaining };
        }
        return {
          allowed: false,
          reason: "You've used all your profile boosts for this month",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      case "maxVoiceMessagesPerMonth":
        if (features.maxVoiceMessagesPerMonth === -1) {
          return { allowed: true };
        }
        const voiceMessagesUsed = currentUsage.voiceMessagesSentThisMonth || 0;
        const voiceMessagesRemaining =
          features.maxVoiceMessagesPerMonth - voiceMessagesUsed;
        if (voiceMessagesRemaining > 0) {
          return { allowed: true, remainingQuota: voiceMessagesRemaining };
        }
        return {
          allowed: false,
          reason: "You've reached your monthly voice message limit",
          upgradeRequired: true,
          showUpgradePrompt: true,
        };

      default:
        return { allowed: true };
    }
  }

  private getFeatureNotAvailableMessage(
    feature: keyof SubscriptionFeatures,
    currentPlan: SubscriptionPlan | undefined
  ): string {
    return getUpgradeMessage(currentPlan, feature);
  }
}

// Export singleton instance
export const featureGateManager = new FeatureGateManager();