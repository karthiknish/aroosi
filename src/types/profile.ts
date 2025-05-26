import type { Id } from "@/../convex/_generated/dataModel";

export interface Profile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  ukCity?: string;
  ukPostcode?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  preferredGender?: string;
  profileImageIds?: string[];
  banned?: boolean;
  createdAt: string;
  updatedAt?: string;
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
