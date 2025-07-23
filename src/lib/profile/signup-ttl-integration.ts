/**
 * Signup TTL Integration
 * Integrates TTL manager with signup flow for profile creation
 */

import { Profile, ProfileFormValues } from "@/types/profile";
import { profileTTLManagerInstance } from "@/lib/storage/profile-ttl-manager";
import { profileTTLStorage } from "@/lib/storage/profile-ttl-manager";

/**
 * Integrates TTL caching with signup flow
 */
export class SignupTTLIntegration {
  /**
   * Cache newly created profile during signup
   */
  cacheSignupProfile(userId: string, profile: Profile): void {
    profileTTLStorage.cacheProfileData(userId, profile);
    profileTTLStorage.cacheProfileImages(userId, profile.profileImageIds || []);
  }

  /**
   * Invalidate signup-related caches
   */
  invalidateSignupCache(userId: string): void {
    profileTTLStorage.invalidateProfileCache(userId);
  }

  /**
   * Handle profile creation during signup
   */
  handleProfileCreation(userId: string, profile: Profile): void {
    this.cacheSignupProfile(userId, profile);
  }

  /**
   * Handle profile completion during signup
   */
  handleProfileCompletion(userId: string, profile: Profile): void {
    this.cacheSignupProfile(userId, profile);
  }

  /**
   * Cache profile data during signup wizard
   */
  cacheProfileDraft(
    userId: string,
    profileData: Partial<ProfileFormValues>
  ): void {
    // Cache draft data with shorter TTL
    this.cacheWithTTL(
      `profile_draft_${userId}`,
      profileData,
      15 * 60 * 1000 // 15 minutes
    );
  }

  /**
   * Get cached profile draft
   */
  getProfileDraft(userId: string): Partial<ProfileFormValues> | null {
    return this.getWithTTL(`profile_draft_${userId}`);
  }

  /**
   * Clear profile draft cache
   */
  clearProfileDraft(userId: string): void {
    this.removeWithTTL(`profile_draft_${userId}`);
  }

  /**
   * Cache with custom TTL
   */
  private cacheWithTTL<T>(key: string, data: T, ttl: number): void {
    profileTTLManager.set(key, data, ttl);
  }

  /**
   * Get cached data with TTL
   */
  private getWithTTL<T>(key: string): T | null {
    return profileTTLManager.get<T>(key);
  }

  /**
   * Remove cached data
   */
  private removeWithTTL(key: string): void {
    profileTTLManager.remove(key);
  }
}

// Export singleton
export const signupTTLIntegration = new SignupTTLIntegration();
