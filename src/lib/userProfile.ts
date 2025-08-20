// Unified Firebase User/Profile Model
// Consolidates user authentication and profile data into a single system

import { adminDb, adminAuth as sharedAdminAuth, adminStorage as sharedAdminStorage } from '@/lib/firebaseAdminInit';
import { calculateProfileCompletion } from '@/lib/userProfile/calculations';

// Firebase services (centralized)
export const db = adminDb;
export const adminAuth = sharedAdminAuth;
export const storage = sharedAdminStorage;

// Collection names
export const COLLECTIONS = { 
  USERS: 'users',
  PROFILES: 'profiles', // Will be deprecated - using unified user documents
  IMAGES: 'images'
} as const;

// Unified User/Profile Document Structure
export interface UserProfile {
  // Authentication fields
  id: string;
  uid: string; // Firebase user ID
  email: string;
  emailVerified: boolean;
  disabled?: boolean;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;

  // User status
  role: "user" | "admin" | "moderator";
  banned?: boolean;
  banReason?: string;
  banExpiresAt?: number;

  // Onboarding/completion status removed
  profileCompletionPercentage: number;

  // Personal information
  fullName?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profileFor?: string; // e.g., 'self', 'relative'
  dateOfBirth?: string; // ISO format date
  age?: number;
  gender?: string;
  preferredGender?: string[];

  // Location
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;

  // Physical attributes
  height?: string; // e.g., "5'8""
  heightCm?: number; // normalized height in centimeters
  weight?: number; // in kg
  physicalStatus?: "normal" | "with_disability";

  // Lifestyle
  maritalStatus?: "single" | "divorced" | "widowed" | "separated";
  diet?: "vegetarian" | "non_vegetarian" | "vegan" | "eggetarian";
  smoking?: "no" | "occasionally" | "yes";
  drinking?: "no" | "occasionally" | "yes";

  // Professional
  education?: string;
  occupation?: string;
  annualIncome?: number;
  annualIncomeCurrency?: string;

  // Cultural
  motherTongue?: string;
  religion?: string;
  caste?: string;
  subcaste?: string;
  ethnicity?: string;
  community?: string;

  // Contact
  phoneNumber?: string;
  whatsappNumber?: string;
  socialMediaLinks?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };

  // About
  aboutMe?: string;
  hobbies?: string[];
  interests?: string[];

  // Preferences
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceHeightMin?: string;
  partnerPreferenceHeightMax?: string;
  partnerPreferenceMaritalStatus?: (
    | "single"
    | "divorced"
    | "widowed"
    | "separated"
  )[];
  partnerPreferenceReligion?: string[];
  partnerPreferenceCaste?: string[];
  partnerPreferenceEducation?: string[];
  partnerPreferenceOccupation?: string[];
  partnerPreferenceAnnualIncomeMin?: number;
  partnerPreferenceLocation?: string[];
  partnerPreferenceCountry?: string[];

  // Media
  profileImageUrls?: string[];
  profileImageStorageIds?: string[];
  mainProfileImageIndex?: number;

  // Subscription
  subscriptionPlan?: "free" | "premium" | "premium_plus";
  subscriptionExpiresAt?: number;
  subscriptionFeatures?: {
    unlimitedLikes?: boolean;
    seeWhoLiked?: boolean;
    advancedSearch?: boolean;
    prioritySupport?: boolean;
  };

  // Engagement features
  boostsRemaining?: number;
  boostedUntil?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  hideFromFreeUsers?: boolean;

  // Privacy settings
  privacySettings?: {
    showProfileToNonMembers?: boolean;
    showOnlineStatus?: boolean;
    showLastSeen?: boolean;
    showDistance?: boolean;
  };

  // Notification preferences
  notificationPreferences?: {
    messages?: boolean;
    matches?: boolean;
    likes?: boolean;
    profileViews?: boolean;
    promotions?: boolean;
  };

  // Activity metrics
  totalProfileViews?: number;
  totalMessagesSent?: number;
  totalMessagesReceived?: number;
  totalLikesGiven?: number;
  totalLikesReceived?: number;
  totalMatches?: number;

  // Verification status
  emailVerificationSentAt?: number;
  phoneVerified?: boolean;
  phoneVerificationSentAt?: number;
  idVerified?: boolean;
  idVerificationDocuments?: string[]; // Storage IDs of verification documents

  // Metadata
  appVersion?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    os?: string;
  };

  // Matching algorithm data
  compatibilityScore?: number;
  searchKeywords?: string[]; // For faster text search

  // Referral program
  referralCode?: string;
  referredBy?: string;
  referredUsers?: string[]; // User IDs of people they referred

  // Analytics
  lastActiveAt?: number;
  loginCount?: number;
  featuresUsed?: string[];
}

// Simplified user document for faster queries
export interface UserDocument {
  id: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  createdAt: number;
  updatedAt: number;
  role: "user" | "admin" | "moderator";
  banned?: boolean;
  fullName?: string;
  displayName?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  city?: string;
  country?: string;
  // isOnboardingComplete removed
  profileCompletionPercentage: number;
  profileImageUrls?: string[];
  subscriptionPlan?: "free" | "premium" | "premium_plus";
  subscriptionExpiresAt?: number;
  lastActiveAt?: number;
}

// createOrUpdateUserProfile moved to '@/lib/userProfile/updates'
export { createOrUpdateUserProfile, updateUserProfile, deleteUserProfile } from '@/lib/userProfile/updates';

// Get user profile by UID
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) return null;
  
  return { id: userDoc.id, ...userDoc.data() } as UserProfile;
}

// Get user profile by email
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const snapshot = await db.collection(COLLECTIONS.USERS)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
    
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as UserProfile;
}

// updateUserProfile & deleteUserProfile moved to '@/lib/userProfile/updates'

// Verify Firebase ID token
export async function verifyFirebaseIdToken(idToken: string) {
  return await adminAuth.verifyIdToken(idToken);
}

// Get Firebase user
export async function getFirebaseUser(uid: string) {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return null;
    }
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error("Error fetching Firebase user:", error);
    return null;
  }
}

// Search users with filters
// (searchUsers moved to '@/lib/userProfile/search')
