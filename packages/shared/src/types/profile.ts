import type {
    ReligiousPractice,
    FamilyValues,
    MarriageViews,
    TraditionalValues,
} from './cultural';

// Generic fallback Id type so shared types compile both in frontend (Next.js) and Convex.
export type Id<_TableName extends string> = string;

export type Gender = 'male' | 'female' | 'non-binary' | 'other';
export type PreferredGender =
    | 'male'
    | 'female'
    | 'non-binary'
    | 'other'
    | 'any'
    | '';
export type MaritalStatus = 'single' | 'divorced' | 'widowed' | 'annulled';
export type Diet =
    | 'vegetarian'
    | 'non-vegetarian'
    | 'vegan'
    | 'eggetarian'
    | 'other'
    | '';
export type SmokingDrinking = 'no' | 'occasionally' | 'yes' | '';
export type PhysicalStatus = 'normal' | 'differently-abled' | 'other' | '';
export type ProfileFor = 'self' | 'friend' | 'family';

// App-level plan identifier used throughout the app (web/server).
// Named to avoid collision with the existing `SubscriptionPlan` interface in shared subscription types.
export type AppSubscriptionPlan = 'free' | 'premium' | 'premiumPlus';

export interface Profile {
    _id: Id<'profiles'>;
    userId: Id<'users'>;
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
    partnerPreferenceCountry?: string[] | string;
    partnerPreferenceEducation?: string[] | string;
    partnerPreferenceOccupation?: string[] | string;
    partnerPreferenceEthnicity?: string[] | string;
    partnerPreferenceMotherTongue?: string[] | string;
    partnerPreferenceDiet?: string[] | string;
    partnerPreferenceMaritalStatus?: string[] | string;
    partnerPreferenceHeightMin?: string;
    partnerPreferenceHeightMax?: string;
    preferredGender: PreferredGender;
    profileImageIds?: string[];
    profileImageUrls?: string[];
    profileCompletionPercentage?: number;
    isApproved?: boolean;

    hideFromFreeUsers?: boolean;
    banned: boolean;
    createdAt: number;
    updatedAt: number;
    _creationTime?: number | string | Date;

    subscriptionPlan?: AppSubscriptionPlan;
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

    images?: string[];
    interests?: string[] | string;
}

export interface ProfileFormValues {
    _id?: Id<'profiles'>;
    userId?: Id<'users'>;
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
    partnerPreferenceCountry?: string[] | string;
    partnerPreferenceEducation?: string[] | string;
    partnerPreferenceOccupation?: string[] | string;
    partnerPreferenceEthnicity?: string[] | string;
    partnerPreferenceMotherTongue?: string[] | string;
    partnerPreferenceDiet?: string[] | string;
    partnerPreferenceMaritalStatus?: string[] | string;
    partnerPreferenceHeightMin?: string;
    partnerPreferenceHeightMax?: string;
    preferredGender: string;
    profileImageIds?: string[];
    profileCompletionPercentage?: number;
    banned?: boolean;
    createdAt?: number;
    updatedAt?: number;
    profileFor: ProfileFor;
    subscriptionPlan?: AppSubscriptionPlan;
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

export interface SubscriptionPlanFeature {
    key: string;
    title: string;
    description: string;
}

export interface SubscriptionPlanDetails {
    id: AppSubscriptionPlan;
    name: string;
    price?: number;
    displayPrice?: string;
    duration?: string;
    features?: string[];
    popular?: boolean;
    badge?: string;
}

// Deprecated: pricing/features should be served by backend; retained for legacy.
export const SUBSCRIPTION_PLANS: SubscriptionPlanDetails[] = [];
