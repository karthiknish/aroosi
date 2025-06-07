import { Id } from "@/../convex/_generated/dataModel";

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
  ukCity: string;
  ukPostcode: string;
  phoneNumber: string;
  aboutMe: string;
  motherTongue: string;
  height: string;
  maritalStatus: "single" | "divorced" | "widowed";
  education: string;
  occupation: string;
  annualIncome: string | number;
  diet: string;
  smoking: string;
  drinking: string;
  physicalStatus: string;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax: number;
  partnerPreferenceUkCity: string[];
  preferredGender: "male" | "female" | "any";
  profileImageIds: string[];
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  hiddenFromSearch: boolean;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime?: number | string | Date;
  isApproved: boolean;
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
  ukCity: string;
  ukPostcode: string;
  phoneNumber: string;
  aboutMe: string;
  motherTongue: string;
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
  partnerPreferenceUkCity: string[];
  preferredGender: string;
  profileImageIds?: string[];
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;
  hiddenFromSearch?: boolean;
  banned?: boolean;
  createdAt?: number;
  updatedAt?: number;
  isApproved?: boolean;
  profileFor: "self" | "friend" | "family";
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
  ukCity?: string;
  gender?: string;
  dateOfBirth?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number | string;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  ukPostcode?: string;
  preferredGender?: string;
  isApproved?: boolean;
}
