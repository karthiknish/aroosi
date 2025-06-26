// Generic fallback Id type so shared types compile both in frontend (Next.js) and Convex.
// When compiling inside Convex, the generated Id type will shadow this one via module resolution.
// On the frontend side we don't need the exact branded type, so a simple string alias is sufficient.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Id<TableName extends string> = string;

/**
 * Profile type
 */
export interface Profile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  clerkId: string;
  email: string;
  role?: string;
  profileFor: "self" | "friend" | "family";
  fullName: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: "single" | "divorced" | "widowed" | "annulled";
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: string;
  smoking: string;
  drinking: string;
  physicalStatus: string;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax: number;
  partnerPreferenceCity: string[] | string;
  preferredGender: "male" | "female" | "any" | "";
  profileImageIds?: string[];
  profileImageUrls?: string[];
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;

  hideFromFreeUsers?: boolean;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime?: number | string | Date;

  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiresAt?: number;
  boostsRemaining?: number;
  boostsMonth?: string;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  boostedUntil?: number;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
}

export interface ProfileFormValues {
  _id?: Id<"profiles">;
  userId?: Id<"users">;
  clerkId?: string;
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
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;

  banned?: boolean;
  createdAt?: number;
  updatedAt?: number;
  profileFor: "self" | "friend" | "family";
  subscriptionPlan?: SubscriptionPlan;
  boostsRemaining?: number;
  motherTongue: string;
  religion: string;
  ethnicity: string;
}

export interface ProfileContextType {
  isProfileComplete: boolean;
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
  price: number;
  displayPrice: string;
  duration: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDetails[] = [
  {
    id: "free",
    name: "Free Plan",
    price: 0,
    displayPrice: "£0",
    duration: "Lifetime",
    features: [
      "Create profile",
      "Search & view limited profiles",
      "Limited daily likes",
      "Receive messages but can't reply",
      "Basic matchmaking",
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: 14.99,
    displayPrice: "£14.99",
    duration: "per month",
    popular: true,
    badge: "Most Popular",
    features: [
      "Unlimited likes & profile views",
      "Initiate chats with other users",
      "Access full profile details (education, family info, etc.)",
      "Daily match suggestions",
      "Hide your profile from non-premium users",
      "Priority customer support",
    ],
  },
  {
    id: "premiumPlus",
    name: "Premium Plus",
    price: 39.99,
    displayPrice: "£39.99",
    duration: "per month",
    features: [
      "All Premium features",
      "Profile Boost (5x per month)",
      "See who viewed your profile",
      "Access to premium-only filters (income, career, education)",
      "Spotlight badge on profile",
    ],
  },
];
