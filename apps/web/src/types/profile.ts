import {
  ReligiousPractice,
  FamilyValues,
  MarriageViews,
  TraditionalValues,
} from "./cultural";

// Generic fallback Id type so shared types compile both in frontend (Next.js) and Convex.
// When compiling inside Convex, the generated Id type will shadow this one via module resolution.
// On the frontend side we don't need the exact branded type, so a simple string alias is sufficient.
export type Id<_TableName extends string> = string;

// Type definitions matching mobile version exactly
export type Gender = "male" | "female" | "non-binary" | "other";
export type PreferredGender = "male" | "female" | "non-binary" | "other" | "any" | "";
export type MaritalStatus = "single" | "divorced" | "widowed" | "annulled";
export type Diet =
  | "vegetarian"
  | "non-vegetarian"
  | "vegan"
  | "eggetarian"
  | "other"
  | "";
export type SmokingDrinking = "no" | "occasionally" | "yes" | "";
export type PhysicalStatus = "normal" | "differently-abled" | "other" | "";
export type ProfileFor = "self" | "friend" | "family";

/**
 * Profile type
 */
export interface Profile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  email: string;
  role?: string;
  profileFor: ProfileFor;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: MaritalStatus;
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: Diet;
  smoking: SmokingDrinking;
  drinking: SmokingDrinking;
  physicalStatus: PhysicalStatus;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax: number;
  partnerPreferenceCity: string[] | string;
  partnerPreferenceReligion?: string[];
  preferredGender: PreferredGender;
  profileImageIds?: string[];
  profileImageUrls?: string[];
  /** Derived percentage (0-100) of profile completion */
  profileCompletionPercentage?: number;
  isApproved?: boolean;

  hideFromFreeUsers?: boolean;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime?: number | string | Date;

  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: number;
  boostsRemaining?: number;
  boostsMonth?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  boostedUntil?: number;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  religiousPractice?: ReligiousPractice;
  familyValues?: FamilyValues;
  marriageViews?: MarriageViews;
  traditionalValues?: TraditionalValues;

  /**
   * Array of raw image URLs belonging to the user profile (legacy support).
   * Prefer using `profileImageUrls` but `images` is retained for backward-compat.
   */
  images?: string[];

  /**
   * Comma-separated string or array of user interests/hobbies.
   */
  interests?: string[] | string;
}

export interface ProfileFormValues {
  _id?: Id<"profiles">;
  userId?: Id<"users">;
  email?: string;
  role?: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: string;
  smoking: string;
  drinking: string;
  physicalStatus: string;
  partnerPreferenceAgeMin: number | string;
  partnerPreferenceAgeMax: number | string;
  partnerPreferenceCity: string[] | string;
  preferredGender: string;
  profileImageIds?: string[];
  profileCompletionPercentage?: number;
  banned?: boolean;
  createdAt?: number;
  updatedAt?: number;
  profileFor: "self" | "friend" | "family";
  subscriptionPlan?: SubscriptionPlan;
  boostsRemaining?: number;
  motherTongue: string;
  religion: string;
  ethnicity: string;
  religiousPractice?: ReligiousPractice;
  familyValues?: FamilyValues;
  marriageViews?: MarriageViews;
  traditionalValues?: TraditionalValues;
}

export interface ProfileContextType {
  /** @deprecated use profile?.isOnboardingComplete */
  isProfileComplete?: boolean;
  isLoading: boolean;
  error: Error | null;
  refetchProfileStatus: () => void;
  profile: Profile | null;
}

export interface ProfileApiResponse {
  profile: Profile;
  error?: string;
}

export type Interest = {
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

export interface ProfileEditFormState {
  fullName?: string;
  city?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string | number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  preferredGender?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  religiousPractice?: ReligiousPractice;
  familyValues?: FamilyValues;
  marriageViews?: MarriageViews;
  traditionalValues?: TraditionalValues;
}

export type SubscriptionPlan = "free" | "premium" | "premiumPlus";

export interface SubscriptionPlanFeature {
  key: string;
  title: string;
  description: string;
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  // price/display fields are served by the backend via /api/stripe/plans to avoid drift
  price?: number;
  displayPrice?: string;
  duration?: string;
  features?: string[];
  popular?: boolean;
  badge?: string;
}

/**
 * Deprecated: Client-side SUBSCRIPTION_PLANS duplicated server truth and could drift.
 * Use GET /api/stripe/plans via stripeUtil.getPlans() for live pricing/features.
 * This constant is retained only for backward compatibility in legacy code paths.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlanDetails[] = [];
