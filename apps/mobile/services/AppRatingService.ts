import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RatingConfig {
  minimumUsageDays: number;
  minimumLaunches: number;
  minimumSignificantEvents: number;
  reminderDelayDays: number;
  maxReminders: number;
}

export interface RatingPromptResult {
  action: 'rate' | 'later' | 'never' | 'dismissed';
  timestamp: number;
}

class AppRatingService {
  private static instance: AppRatingService;
  private config: RatingConfig;
  private storeReviewModule: any = null;

  // Storage keys
  private static readonly STORAGE_KEYS = {
    FIRST_LAUNCH: 'app_rating_first_launch',
    LAUNCH_COUNT: 'app_rating_launch_count',
    SIGNIFICANT_EVENTS: 'app_rating_significant_events',
    LAST_PROMPT: 'app_rating_last_prompt',
    PROMPT_COUNT: 'app_rating_prompt_count',
    USER_RESPONSE: 'app_rating_user_response',
    RATED: 'app_rating_rated',
  };

  static getInstance(config?: Partial<RatingConfig>): AppRatingService {
    if (!AppRatingService.instance) {
      AppRatingService.instance = new AppRatingService(config);
    }
    return AppRatingService.instance;
  }

  private constructor(config?: Partial<RatingConfig>) {
    this.config = {
      minimumUsageDays: 7,
      minimumLaunches: 10,
      minimumSignificantEvents: 5,
      reminderDelayDays: 7,
      maxReminders: 3,
      ...config,
    };

    this.loadStoreReviewModule();
  }

  private async loadStoreReviewModule() {
    try {
      // @ts-expect-error - Expo StoreReview
      this.storeReviewModule = require('expo-store-review');
    } catch (error) {
      console.warn('Store review module not available:', error);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Record first launch if not already recorded
      const firstLaunch = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.FIRST_LAUNCH);
      if (!firstLaunch) {
        await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.FIRST_LAUNCH, Date.now().toString());
      }

      // Increment launch count
      await this.incrementLaunchCount();
    } catch (error) {
      console.error('Failed to initialize app rating service:', error);
    }
  }

  private async incrementLaunchCount(): Promise<void> {
    try {
      const currentCount = await this.getLaunchCount();
      await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.LAUNCH_COUNT, (currentCount + 1).toString());
    } catch (error) {
      console.error('Failed to increment launch count:', error);
    }
  }

  async recordSignificantEvent(eventType: string = 'generic'): Promise<void> {
    try {
      const currentCount = await this.getSignificantEventCount();
      await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.SIGNIFICANT_EVENTS, (currentCount + 1).toString());
      
      console.log(`Recorded significant event: ${eventType}. Total events: ${currentCount + 1}`);
    } catch (error) {
      console.error('Failed to record significant event:', error);
    }
  }

  async shouldShowRatingPrompt(): Promise<boolean> {
    try {
      // Check if user already rated or declined permanently
      const userResponse = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.USER_RESPONSE);
      if (userResponse === 'never' || userResponse === 'rate') {
        return false;
      }

      // Check if maximum reminders reached
      const promptCount = await this.getPromptCount();
      if (promptCount >= this.config.maxReminders) {
        return false;
      }

      // Check minimum usage days
      const firstLaunch = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.FIRST_LAUNCH);
      if (firstLaunch) {
        const daysSinceFirstLaunch = (Date.now() - parseInt(firstLaunch)) / (1000 * 60 * 60 * 24);
        if (daysSinceFirstLaunch < this.config.minimumUsageDays) {
          return false;
        }
      }

      // Check minimum launches
      const launchCount = await this.getLaunchCount();
      if (launchCount < this.config.minimumLaunches) {
        return false;
      }

      // Check minimum significant events
      const significantEvents = await this.getSignificantEventCount();
      if (significantEvents < this.config.minimumSignificantEvents) {
        return false;
      }

      // Check if enough time passed since last prompt
      const lastPrompt = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.LAST_PROMPT);
      if (lastPrompt) {
        const daysSinceLastPrompt = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPrompt < this.config.reminderDelayDays) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking if should show rating prompt:', error);
      return false;
    }
  }

  async showRatingPrompt(): Promise<RatingPromptResult> {
    try {
      // Update prompt tracking
      await this.recordPromptShown();

      // Try to use native in-app review if available
      if (this.storeReviewModule && await this.storeReviewModule.isAvailableAsync()) {
        await this.storeReviewModule.requestReview();
        
        const result: RatingPromptResult = {
          action: 'rate',
          timestamp: Date.now(),
        };
        
        await this.recordUserResponse('rate');
        return result;
      }

      // Fallback to custom alert dialog
      return this.showCustomRatingDialog();
    } catch (error) {
      console.error('Failed to show rating prompt:', error);
      return { action: 'dismissed', timestamp: Date.now() };
    }
  }

  private showCustomRatingDialog(): Promise<RatingPromptResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Rate Aroosi',
        'Are you enjoying Aroosi? Please take a moment to rate us in the app store!',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              this.recordUserResponse('later');
              resolve({ action: 'later', timestamp: Date.now() });
            },
          },
          {
            text: 'Never',
            style: 'destructive',
            onPress: () => {
              this.recordUserResponse('never');
              resolve({ action: 'never', timestamp: Date.now() });
            },
          },
          {
            text: 'Rate App',
            onPress: () => {
              this.openStoreRating();
              this.recordUserResponse('rate');
              resolve({ action: 'rate', timestamp: Date.now() });
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve({ action: 'dismissed', timestamp: Date.now() }) }
      );
    });
  }

  private async openStoreRating(): Promise<void> {
    try {
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/aroosi/id123456789?action=write-review',
        android: 'market://details?id=com.aroosi.app&showAllReviews=true',
      });

      if (storeUrl) {
        const supported = await Linking.canOpenURL(storeUrl);
        if (supported) {
          await Linking.openURL(storeUrl);
        } else {
          // Fallback URLs
          const fallbackUrl = Platform.select({
            ios: 'https://apps.apple.com/app/aroosi/id123456789',
            android: 'https://play.google.com/store/apps/details?id=com.aroosi.app',
          });
          if (fallbackUrl) {
            await Linking.openURL(fallbackUrl);
          }
        }
      }
    } catch (error) {
      console.error('Failed to open store rating:', error);
    }
  }

  private async recordPromptShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.LAST_PROMPT, Date.now().toString());
      
      const currentCount = await this.getPromptCount();
      await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.PROMPT_COUNT, (currentCount + 1).toString());
    } catch (error) {
      console.error('Failed to record prompt shown:', error);
    }
  }

  private async recordUserResponse(response: string): Promise<void> {
    try {
      await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.USER_RESPONSE, response);
      if (response === 'rate') {
        await AsyncStorage.setItem(AppRatingService.STORAGE_KEYS.RATED, 'true');
      }
    } catch (error) {
      console.error('Failed to record user response:', error);
    }
  }

  // Getter methods
  private async getLaunchCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.LAUNCH_COUNT);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getSignificantEventCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.SIGNIFICANT_EVENTS);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getPromptCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.PROMPT_COUNT);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  // Public getter methods
  async hasUserRated(): Promise<boolean> {
    try {
      const rated = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.RATED);
      return rated === 'true';
    } catch (error) {
      return false;
    }
  }

  async getUsageStats(): Promise<{
    daysSinceFirstLaunch: number;
    launchCount: number;
    significantEvents: number;
    promptCount: number;
  }> {
    try {
      const firstLaunch = await AsyncStorage.getItem(AppRatingService.STORAGE_KEYS.FIRST_LAUNCH);
      const daysSinceFirstLaunch = firstLaunch ? (Date.now() - parseInt(firstLaunch)) / (1000 * 60 * 60 * 24) : 0;
      
      return {
        daysSinceFirstLaunch: Math.floor(daysSinceFirstLaunch),
        launchCount: await this.getLaunchCount(),
        significantEvents: await this.getSignificantEventCount(),
        promptCount: await this.getPromptCount(),
      };
    } catch (error) {
      return {
        daysSinceFirstLaunch: 0,
        launchCount: 0,
        significantEvents: 0,
        promptCount: 0,
      };
    }
  }

  // Reset methods (useful for testing)
  async reset(): Promise<void> {
    try {
      await Promise.all(
        Object.values(AppRatingService.STORAGE_KEYS).map(key => 
          AsyncStorage.removeItem(key)
        )
      );
    } catch (error) {
      console.error('Failed to reset app rating data:', error);
    }
  }
}

export default AppRatingService;