import { Id } from "@/../convex/_generated/dataModel";

export interface Profile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  clerkId: string;
  email: string;
  role?: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  ukCity: string;
  ukPostcode: string;
  phoneNumber: string;
  aboutMe: string;
  religion: string;
  caste: string;
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
  partnerPreferenceReligion: string[];
  partnerPreferenceUkCity: string[];
  preferredGender: "male" | "female" | "any";
  profileImageIds: string[];
  isProfileComplete: boolean;
  hiddenFromSearch: boolean;
  banned: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime?: number | string | Date;
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
  religion: string;
  caste: string;
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
  partnerPreferenceReligion: string[];
  partnerPreferenceUkCity: string[];
  preferredGender: string;
  profileImageIds?: string[];
  isProfileComplete?: boolean;
  hiddenFromSearch?: boolean;
  banned?: boolean;
  createdAt?: number;
  updatedAt?: number;
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

export type ProfileEditFormState = {
  fullName?: string;
  ukCity?: string;
  gender?: string;
  dateOfBirth?: string;
  religion?: string;
  caste?: string;
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
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  banned?: boolean;
  ukPostcode?: string;
  preferredGender?: string;
};
