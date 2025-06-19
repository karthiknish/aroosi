import { useEffect, useCallback } from 'react';
import AppRatingService, { RatingConfig, RatingPromptResult } from '../services/AppRatingService';

interface AppRatingHook {
  recordSignificantEvent: (eventType?: string) => Promise<void>;
  checkAndShowRatingPrompt: () => Promise<RatingPromptResult | null>;
  shouldShowRatingPrompt: () => Promise<boolean>;
  showRatingPrompt: () => Promise<RatingPromptResult>;
  hasUserRated: () => Promise<boolean>;
  getUsageStats: () => Promise<{
    daysSinceFirstLaunch: number;
    launchCount: number;
    significantEvents: number;
    promptCount: number;
  }>;
}

export default function useAppRating(config?: Partial<RatingConfig>): AppRatingHook {
  const ratingService = AppRatingService.getInstance(config);

  // Initialize on mount
  useEffect(() => {
    ratingService.initialize();
  }, []);

  const recordSignificantEvent = useCallback(async (eventType?: string) => {
    await ratingService.recordSignificantEvent(eventType);
  }, []);

  const checkAndShowRatingPrompt = useCallback(async (): Promise<RatingPromptResult | null> => {
    const shouldShow = await ratingService.shouldShowRatingPrompt();
    if (shouldShow) {
      return await ratingService.showRatingPrompt();
    }
    return null;
  }, []);

  const shouldShowRatingPrompt = useCallback(async () => {
    return await ratingService.shouldShowRatingPrompt();
  }, []);

  const showRatingPrompt = useCallback(async () => {
    return await ratingService.showRatingPrompt();
  }, []);

  const hasUserRated = useCallback(async () => {
    return await ratingService.hasUserRated();
  }, []);

  const getUsageStats = useCallback(async () => {
    return await ratingService.getUsageStats();
  }, []);

  return {
    recordSignificantEvent,
    checkAndShowRatingPrompt,
    shouldShowRatingPrompt,
    showRatingPrompt,
    hasUserRated,
    getUsageStats,
  };
}

// Convenience hook with common significant events for matrimony app
export function useMatrimonyAppRating(config?: Partial<RatingConfig>) {
  const rating = useAppRating(config);

  const recordMatch = useCallback(async () => {
    await rating.recordSignificantEvent('match_created');
  }, [rating]);

  const recordMessage = useCallback(async () => {
    await rating.recordSignificantEvent('message_sent');
  }, [rating]);

  const recordProfileView = useCallback(async () => {
    await rating.recordSignificantEvent('profile_viewed');
  }, [rating]);

  const recordInterest = useCallback(async () => {
    await rating.recordSignificantEvent('interest_sent');
  }, [rating]);

  const recordProfileComplete = useCallback(async () => {
    await rating.recordSignificantEvent('profile_completed');
  }, [rating]);

  const recordPremiumSubscription = useCallback(async () => {
    await rating.recordSignificantEvent('premium_subscribed');
  }, [rating]);

  const recordProfilePhotoUploaded = useCallback(async () => {
    await rating.recordSignificantEvent('photo_uploaded');
  }, [rating]);

  return {
    ...rating,
    // Matrimony-specific event recording
    recordMatch,
    recordMessage,
    recordProfileView,
    recordInterest,
    recordProfileComplete,
    recordPremiumSubscription,
    recordProfilePhotoUploaded,
  };
}