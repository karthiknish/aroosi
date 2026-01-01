import { useState, useEffect, useCallback } from "react";
import { useSubscriptionStatus } from "./useSubscription";

export type SubscriptionTier = "free" | "premium" | "premiumPlus";

export interface MessagingFeatures {
  canSendUnlimitedMessages: boolean;
  canSendVoiceMessages: boolean;
  canSendImageMessages: boolean;
  canInitiateChats: boolean;
  dailyMessageLimit: number;
  voiceMessageDurationLimit: number; // in seconds
  imageMessageLimit: number;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Get messaging features based on subscription tier
 */
export function getMessagingFeatures(
  tier: SubscriptionTier
): MessagingFeatures {
  switch (tier) {
    case "free":
      return {
        canSendUnlimitedMessages: false,
        canSendVoiceMessages: false,
        canSendImageMessages: false,
        canInitiateChats: false,
        dailyMessageLimit: 5,
        voiceMessageDurationLimit: 0,
        imageMessageLimit: 0,
      };
    case "premium":
      return {
        canSendUnlimitedMessages: true,
        canSendVoiceMessages: true,
        canSendImageMessages: true,
        canInitiateChats: true,
        dailyMessageLimit: -1, // unlimited
        voiceMessageDurationLimit: 60, // 1 minute
        imageMessageLimit: 10,
      };
    case "premiumPlus":
      return {
        canSendUnlimitedMessages: true,
        canSendVoiceMessages: true,
        canSendImageMessages: true,
        canInitiateChats: true,
        dailyMessageLimit: -1, // unlimited
        voiceMessageDurationLimit: 300, // 5 minutes
        imageMessageLimit: -1, // unlimited
      };
    default:
      return getMessagingFeatures("free");
  }
}

/**
 * Class for managing messaging permissions with daily limits
 */
export class MessagingPermissions {
  private tier: SubscriptionTier;
  private features: MessagingFeatures;
  private dailyMessageCount: number = 0;
  private lastResetDate: string = "";

  constructor(tier: SubscriptionTier) {
    this.tier = tier;
    this.features = getMessagingFeatures(tier);
    this.loadDailyCount();
  }

  private loadDailyCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("dailyMessageCount");
    const storedDate = localStorage.getItem("dailyMessageDate");

    if (storedDate === today && stored) {
      this.dailyMessageCount = parseInt(stored, 10);
    } else {
      this.dailyMessageCount = 0;
      this.lastResetDate = today;
      this.saveDailyCount();
    }
  }

  private saveDailyCount() {
    const today = new Date().toDateString();
    localStorage.setItem(
      "dailyMessageCount",
      this.dailyMessageCount.toString()
    );
    localStorage.setItem("dailyMessageDate", today);
  }

  canInitiateChat(): PermissionResult {
    if (!this.features.canInitiateChats) {
      return {
        allowed: false,
        reason:
          "Upgrade to Premium to initiate new chats. You can reply to messages from your matches.",
      };
    }
    return { allowed: true };
  }

  canSendTextMessage(): PermissionResult {
    if (this.features.dailyMessageLimit === -1) {
      return { allowed: true };
    }

    if (this.dailyMessageCount >= this.features.dailyMessageLimit) {
      return {
        allowed: false,
        reason:
          "Daily message limit reached. Upgrade to Premium for unlimited messaging.",
      };
    }

    return { allowed: true };
  }

  canSendVoiceMessage(duration?: number): PermissionResult {
    if (!this.features.canSendVoiceMessages) {
      return {
        allowed: false,
        reason:
          "Voice messages are a Premium feature. Upgrade to send voice messages.",
      };
    }

    if (duration && duration > this.features.voiceMessageDurationLimit) {
      return {
        allowed: false,
        reason: `Voice messages are limited to ${this.features.voiceMessageDurationLimit} seconds for your plan.`,
      };
    }

    return { allowed: true };
  }

  canSendImageMessage(): PermissionResult {
    if (!this.features.canSendImageMessages) {
      return {
        allowed: false,
        reason: "Image messages are a Premium feature. Upgrade to send images.",
      };
    }

    return { allowed: true };
  }

  recordMessageSent() {
    if (this.features.dailyMessageLimit !== -1) {
      this.dailyMessageCount++;
      this.saveDailyCount();
    }
  }

  getRemainingDailyMessages(): number {
    if (this.features.dailyMessageLimit === -1) {
      return -1; // unlimited
    }
    return Math.max(
      0,
      this.features.dailyMessageLimit - this.dailyMessageCount
    );
  }

  updateSubscriptionTier(tier: SubscriptionTier) {
    this.tier = tier;
    this.features = getMessagingFeatures(tier);
  }
}

/**
 * Hook for managing messaging features and permissions based on subscription tier
 */
export function useMessagingFeatures() {
  const subscriptionStatus = useSubscriptionStatus();
  const subscriptionTier = (subscriptionStatus.data?.plan ||
    "free") as SubscriptionTier;

  const [permissions, setPermissions] = useState<MessagingPermissions | null>(
    null
  );
  const [features, setFeatures] = useState<MessagingFeatures | null>(null);

  // Initialize permissions when subscription tier changes
  useEffect(() => {
    if (subscriptionTier) {
      const messagingFeatures = getMessagingFeatures(subscriptionTier);
      const messagingPermissions = new MessagingPermissions(subscriptionTier);

      setFeatures(messagingFeatures);
      setPermissions(messagingPermissions);
    }
  }, [subscriptionTier]);

  // Check if user can initiate a chat
  const canInitiateChat = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canInitiateChat();
  }, [permissions]);

  // Check if user can send a text message
  const canSendTextMessage = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canSendTextMessage();
  }, [permissions]);

  // Check if user can send a voice message
  const canSendVoiceMessage = useCallback(
    (duration?: number) => {
      if (!permissions)
        return { allowed: false, reason: "Loading permissions..." };
      return permissions.canSendVoiceMessage(duration);
    },
    [permissions]
  );

  // Check if user can send an image message
  const canSendImageMessage = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canSendImageMessage();
  }, [permissions]);

  // Record that a message was sent (for daily limit tracking)
  const recordMessageSent = useCallback(() => {
    if (permissions) {
      permissions.recordMessageSent();
    }
  }, [permissions]);

  // Get remaining daily messages
  const getRemainingDailyMessages = useCallback(() => {
    if (!permissions) return 0;
    return permissions.getRemainingDailyMessages();
  }, [permissions]);

  return {
    // Current features and permissions
    features,
    permissions,
    subscriptionTier,

    // Permission check functions
    canInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,

    // Usage tracking
    recordMessageSent,
    getRemainingDailyMessages,

    // Loading state
    isLoading: !features || !permissions,
  };
}

/**
 * Hook for managing daily message limits
 */
export function useDailyMessageLimit() {
  const {
    features,
    getRemainingDailyMessages,
    recordMessageSent,
    subscriptionTier,
  } = useMessagingFeatures();

  const [remainingMessages, setRemainingMessages] = useState<number>(0);

  // Update remaining messages count
  const updateRemainingMessages = useCallback(() => {
    const remaining = getRemainingDailyMessages();
    setRemainingMessages(remaining);
  }, [getRemainingDailyMessages]);

  // Record message sent and update count
  const recordMessage = useCallback(() => {
    recordMessageSent();
    updateRemainingMessages();
  }, [recordMessageSent, updateRemainingMessages]);

  // Check if user has unlimited messages
  const hasUnlimitedMessages = features?.canSendUnlimitedMessages || false;

  // Check if user is near daily limit (within 2 messages)
  const isNearLimit =
    !hasUnlimitedMessages && remainingMessages <= 2 && remainingMessages > 0;

  // Check if user has reached daily limit
  const hasReachedLimit = !hasUnlimitedMessages && remainingMessages <= 0;

  // Update remaining messages when features change
  useEffect(() => {
    updateRemainingMessages();
  }, [updateRemainingMessages, features]);

  return {
    remainingMessages,
    hasUnlimitedMessages,
    isNearLimit,
    hasReachedLimit,
    dailyLimit: features?.dailyMessageLimit || 0,
    subscriptionTier,
    recordMessage,
    updateRemainingMessages,
  };
}

/**
 * Hook for voice message duration limits
 */
export function useVoiceMessageLimits() {
  const { features, canSendVoiceMessage, subscriptionTier } =
    useMessagingFeatures();

  const maxDuration = features?.voiceMessageDurationLimit || 0;
  const canSendVoice = features?.canSendVoiceMessages || false;

  // Check if a specific duration is allowed
  const isDurationAllowed = useCallback(
    (duration: number) => {
      if (!canSendVoice) return false;
      if (maxDuration === 0) return false;
      return duration <= maxDuration;
    },
    [canSendVoice, maxDuration]
  );

  // Get remaining duration for current recording
  const getRemainingDuration = useCallback(
    (currentDuration: number) => {
      if (!canSendVoice || maxDuration === 0) return 0;
      return Math.max(0, maxDuration - currentDuration);
    },
    [canSendVoice, maxDuration]
  );

  // Check if user is near duration limit (within 10 seconds)
  const isNearDurationLimit = useCallback(
    (currentDuration: number) => {
      if (!canSendVoice || maxDuration === 0) return false;
      const remaining = getRemainingDuration(currentDuration);
      return remaining <= 10 && remaining > 0;
    },
    [canSendVoice, maxDuration, getRemainingDuration]
  );

  return {
    maxDuration,
    canSendVoice,
    subscriptionTier,
    isDurationAllowed,
    getRemainingDuration,
    isNearDurationLimit,
    checkDuration: canSendVoiceMessage,
  };
}
