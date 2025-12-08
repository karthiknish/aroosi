/**
 * Profile-specific TTL (Time-to-Live) Manager
 * Integrates TTL caching with profile data fetching and management
 */

import { Profile } from "@/types/profile";
import { profileTTLManager } from "./ttl-manager";

// TTL configurations for different profile data types
export const PROFILE_TTL_CONFIG = {
  PROFILE_DATA: 30 * 60 * 1000, // 30 minutes
  PROFILE_IMAGES: 60 * 60 * 1000, // 1 hour
  PROFILE_LISTINGS: 15 * 60 * 1000, // 15 minutes
  SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes
  OFFLINE_CACHE: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Key generators for profile data
export const ProfileTTLKeys = {
  profileData: (userId: string) => `profile_data_${userId}`,
  profileImages: (userId: string) => `profile_images_${userId}`,
  profileListings: (userId: string) => `profile_listings_${userId}`,
  searchResults: (query: string) => `search_${btoa(query)}`,
  offlineProfile: (userId: string) => `offline_profile_${userId}`,
} as const;

/**
 * Profile TTL Manager with enhanced caching capabilities
 */
export class ProfileTTLManager {
  private ttlManager = profileTTLManager;

  /**
   * Cache profile data with TTL
   */
  cacheProfileData(userId: string, profile: Profile): void {
    this.ttlManager.set(
      ProfileTTLKeys.profileData(userId),
      profile,
      PROFILE_TTL_CONFIG.PROFILE_DATA
    );
  }

  /**
   * Get cached profile data
   */
  getCachedProfileData(userId: string): Profile | null {
    return this.ttlManager.get<Profile>(ProfileTTLKeys.profileData(userId));
  }

  /**
   * Cache profile images with TTL
   */
  cacheProfileImages(userId: string, images: any[]): void {
    this.ttlManager.set(
      ProfileTTLKeys.profileImages(userId),
      images,
      PROFILE_TTL_CONFIG.PROFILE_IMAGES
    );
  }

  /**
   * Get cached profile images
   */
  getCachedProfileImages(userId: string): any[] | null {
    return this.ttlManager.get<any[]>(ProfileTTLKeys.profileImages(userId));
  }

  /**
   * Cache search results with TTL
   */
  cacheSearchResults(query: string, results: any[]): void {
    this.ttlManager.set(
      ProfileTTLKeys.searchResults(query),
      results,
      PROFILE_TTL_CONFIG.SEARCH_RESULTS
    );
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(query: string): any[] | null {
    return this.ttlManager.get<any[]>(ProfileTTLKeys.searchResults(query));
  }

  /**
   * Cache offline profile data
   */
  cacheOfflineProfile(userId: string, profile: Profile): void {
    this.ttlManager.set(
      ProfileTTLKeys.offlineProfile(userId),
      profile,
      PROFILE_TTL_CONFIG.OFFLINE_CACHE
    );
  }

  /**
   * Get offline profile data
   */
  getOfflineProfile(userId: string): Profile | null {
    return this.ttlManager.get<Profile>(ProfileTTLKeys.offlineProfile(userId));
  }

  /**
   * Invalidate profile cache
   */
  invalidateProfileCache(userId: string): void {
    this.ttlManager.remove(ProfileTTLKeys.profileData(userId));
    this.ttlManager.remove(ProfileTTLKeys.profileImages(userId));
    this.ttlManager.remove(ProfileTTLKeys.offlineProfile(userId));
  }

  /**
   * Invalidate all profile-related caches
   */
  invalidateAllProfileCaches(): void {
    const keys = this.ttlManager.keys();
    keys.forEach((key) => {
      if (key.startsWith("profile_") || key.startsWith("offline_profile_")) {
        this.ttlManager.remove(key);
      }
    });
  }

  /**
   * Check if profile data is cached and valid
   */
  hasValidProfileData(userId: string): boolean {
    return this.ttlManager.has(ProfileTTLKeys.profileData(userId));
  }

  /**
   * Get remaining TTL for profile data
   */
  getProfileDataTTL(userId: string): number {
    return this.ttlManager.getRemainingTTL(ProfileTTLKeys.profileData(userId));
  }

  /**
   * Force cleanup of expired profile data
   */
  cleanupExpiredProfileData(): void {
    this.ttlManager.cleanup();
  }

  /**
   * Get all cached profile user IDs
   */
  getCachedProfileUserIds(): string[] {
    const keys = this.ttlManager.keys();
    return keys
      .filter((key) => key.startsWith("profile_data_"))
      .map((key) => key.replace("profile_data_", ""));
  }
}

// Export singleton instance
export const profileTTLManagerInstance = new ProfileTTLManager();

// Utility functions for direct usage
export const profileTTLStorage = {
  cacheProfileData: (userId: string, profile: Profile) =>
    profileTTLManagerInstance.cacheProfileData(userId, profile),
  getCachedProfileData: (userId: string) =>
    profileTTLManagerInstance.getCachedProfileData(userId),
  cacheProfileImages: (userId: string, images: any[]) =>
    profileTTLManagerInstance.cacheProfileImages(userId, images),
  getCachedProfileImages: (userId: string) =>
    profileTTLManagerInstance.getCachedProfileImages(userId),
  invalidateProfileCache: (userId: string) =>
    profileTTLManagerInstance.invalidateProfileCache(userId),
  hasValidProfileData: (userId: string) =>
    profileTTLManagerInstance.hasValidProfileData(userId),
  cleanupExpiredProfileData: () =>
    profileTTLManagerInstance.cleanupExpiredProfileData(),
};
