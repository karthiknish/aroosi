"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Profile, ProfileFormValues } from "@/types/profile";
import ProfileFormComponent from "@/components/profile/ProfileForm";
import { useAuthContext } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "@convex/_generated/dataModel";
import {
  getCurrentUserWithProfile,
  updateUserProfile,
} from "@/lib/profile/userProfileApi";
import { ProfileFormValues as ProfileFormComponentValues } from "@/components/profile/ProfileForm";

// Default profile data matching the Profile interface
const defaultProfile: Profile = {
  _id: "" as Id<"profiles">,
  userId: "" as Id<"users">,
  clerkId: "",
  email: "",
  fullName: "",
  dateOfBirth: "",
  gender: "other",
  ukCity: "",
  ukPostcode: "",
  phoneNumber: "",
  aboutMe: "",
  religion: "",
  caste: "",
  motherTongue: "",
  height: "",
  maritalStatus: "single",
  education: "",
  occupation: "",
  annualIncome: "",
  diet: "",
  smoking: "",
  drinking: "",
  physicalStatus: "",
  partnerPreferenceAgeMin: 18,
  partnerPreferenceAgeMax: 80,
  partnerPreferenceReligion: [],
  partnerPreferenceUkCity: [],
  preferredGender: "any",
  profileImageIds: [],
  isProfileComplete: false,
  isOnboardingComplete: false,
  hiddenFromSearch: false,
  banned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Type conversion functions
function convertProfileToFormValues(
  profile: Partial<Profile>
): ProfileFormValues {
  return {
    _id: profile._id,
    userId: profile.userId,
    clerkId: profile.clerkId,
    email: profile.email,
    role: profile.role,
    fullName: String(profile.fullName ?? ""),
    dateOfBirth: String(profile.dateOfBirth ?? ""),
    gender: String(profile.gender ?? ""),
    ukCity: String(profile.ukCity ?? ""),
    ukPostcode: String(profile.ukPostcode ?? ""),
    phoneNumber: String(profile.phoneNumber ?? ""),
    aboutMe: String(profile.aboutMe ?? ""),
    religion: String(profile.religion ?? ""),
    caste: String(profile.caste ?? ""),
    motherTongue: String(profile.motherTongue ?? ""),
    height: String(profile.height ?? ""),
    maritalStatus: String(profile.maritalStatus ?? ""),
    education: String(profile.education ?? ""),
    occupation: String(profile.occupation ?? ""),
    annualIncome: profile.annualIncome ?? "",
    diet: String(profile.diet ?? ""),
    smoking: String(profile.smoking ?? ""),
    drinking: String(profile.drinking ?? ""),
    physicalStatus: String(profile.physicalStatus ?? ""),
    partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin ?? "",
    partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax ?? "",
    partnerPreferenceReligion: Array.isArray(profile.partnerPreferenceReligion)
      ? profile.partnerPreferenceReligion
      : [],
    partnerPreferenceUkCity: Array.isArray(profile.partnerPreferenceUkCity)
      ? profile.partnerPreferenceUkCity
      : [],
    preferredGender: String(profile.preferredGender ?? ""),
    profileImageIds: Array.isArray(profile.profileImageIds)
      ? profile.profileImageIds
      : [],
    isProfileComplete: profile.isProfileComplete ?? false,
    isOnboardingComplete: profile.isOnboardingComplete ?? false,
    hiddenFromSearch: profile.hiddenFromSearch ?? false,
    banned: profile.banned ?? false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function convertFormValuesToProfile(
  formValues: ProfileFormValues,
  existingProfile: Partial<Profile> = {}
): Profile {
  return {
    ...defaultProfile,
    ...existingProfile,
    ...formValues,
    gender: String(formValues.gender ?? "other"),
    partnerPreferenceAgeMin:
      typeof formValues.partnerPreferenceAgeMin === "string"
        ? parseInt(formValues.partnerPreferenceAgeMin, 10) || 18
        : (formValues.partnerPreferenceAgeMin ?? 18),
    partnerPreferenceAgeMax:
      typeof formValues.partnerPreferenceAgeMax === "string"
        ? parseInt(formValues.partnerPreferenceAgeMax, 10) || 80
        : (formValues.partnerPreferenceAgeMax ?? 80),
    maritalStatus: (["single", "divorced", "widowed"].includes(
      formValues.maritalStatus
    )
      ? formValues.maritalStatus
      : "single") as "single" | "divorced" | "widowed",
    preferredGender: (["male", "female", "any"].includes(
      formValues.preferredGender
    )
      ? formValues.preferredGender
      : "any") as "male" | "female" | "any",
    updatedAt: Date.now(),
  };
}

// Utility to map canonical ProfileFormValues to ProfileForm's expected shape
function toProfileFormComponentValues(
  values: ProfileFormValues
): ProfileFormComponentValues {
  return {
    fullName: values.fullName ?? "",
    dateOfBirth: values.dateOfBirth ?? "",
    gender:
      (values.gender as
        | "male"
        | "female"
        | "non-binary"
        | "prefer-not-to-say"
        | "other") || "other",
    height: values.height ?? "",
    ukCity: values.ukCity ?? "",
    aboutMe: values.aboutMe ?? "",
    phoneNumber: values.phoneNumber ?? "",
    preferredGender: values.preferredGender ?? "",
    partnerPreferenceAgeMin: String(values.partnerPreferenceAgeMin ?? ""),
    partnerPreferenceAgeMax: String(values.partnerPreferenceAgeMax ?? ""),
    partnerPreferenceReligion: Array.isArray(values.partnerPreferenceReligion)
      ? values.partnerPreferenceReligion.join(", ")
      : String(values.partnerPreferenceReligion ?? ""),
    partnerPreferenceUkCity: Array.isArray(values.partnerPreferenceUkCity)
      ? values.partnerPreferenceUkCity.join(", ")
      : String(values.partnerPreferenceUkCity ?? ""),
    religion: values.religion ?? "",
    caste: values.caste ?? "",
    motherTongue: values.motherTongue ?? "",
    maritalStatus: values.maritalStatus ?? "",
    education: values.education ?? "",
    occupation: values.occupation ?? "",
    annualIncome: String(values.annualIncome ?? ""),
  };
}

// Utility to map ProfileFormComponentValues (with string fields for arrays) back to canonical ProfileFormValues
function fromProfileFormComponentValues(
  values: ProfileFormComponentValues & { profileImageIds: string[] }
): ProfileFormValues & { profileImageIds: string[] } {
  return {
    fullName: values.fullName ?? "",
    dateOfBirth:
      values.dateOfBirth instanceof Date
        ? values.dateOfBirth.toISOString()
        : ((values.dateOfBirth as string) ?? ""),
    gender: values.gender ?? "other",
    height: values.height ?? "",
    ukCity: values.ukCity ?? "",
    ukPostcode: "", // default, as not present in form
    phoneNumber: values.phoneNumber ?? "",
    aboutMe: values.aboutMe ?? "",
    religion: values.religion ?? "",
    caste: values.caste ?? "",
    motherTongue: values.motherTongue ?? "",
    maritalStatus: values.maritalStatus ?? "",
    education: values.education ?? "",
    occupation: values.occupation ?? "",
    annualIncome: values.annualIncome ?? "",
    diet: "", // default, as not present in form
    smoking: "", // default, as not present in form
    drinking: "", // default, as not present in form
    physicalStatus: "", // default, as not present in form
    partnerPreferenceAgeMin: values.partnerPreferenceAgeMin ?? "",
    partnerPreferenceAgeMax: values.partnerPreferenceAgeMax ?? "",
    partnerPreferenceReligion:
      typeof values.partnerPreferenceReligion === "string"
        ? values.partnerPreferenceReligion
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    partnerPreferenceUkCity:
      typeof values.partnerPreferenceUkCity === "string"
        ? values.partnerPreferenceUkCity
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    preferredGender: values.preferredGender ?? "",
    profileImageIds: values.profileImageIds ?? [],
    isProfileComplete: false,
    isOnboardingComplete: false,
    hiddenFromSearch: false,
    banned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, profile: authProfile, isSignedIn } = useAuthContext();
  const userId = authProfile?.id;
  const [serverError, setServerError] = useState<string | null>(null);
  const [profileDataState, setProfileDataState] = useState<Profile | null>(
    null
  );

  // Memoize the query key to prevent unnecessary refetches
  const profileQueryKey = useMemo(() => ["profile", userId], [userId]);

  // Fetch profile data
  const {
    data: profileApiData,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<Profile | null>({
    queryKey: profileQueryKey,
    queryFn: async () => {
      if (!token) return null;
      const result = await getCurrentUserWithProfile(token);
      return result.success ? (result.data as Profile) : null;
    },
    enabled: !!token,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle successful profile fetch
  useEffect(() => {
    if (profileApiData) {
      setProfileDataState(profileApiData);
    }
  }, [profileApiData]);

  // Handle profile fetch error
  useEffect(() => {
    if (isProfileError) {
      console.error("Error fetching profile:", profileError);
      toast.error("Failed to load profile data");
    }
  }, [isProfileError, profileError]);

  // Memoized profile data for type safety and consistency
  const profileData: Profile = useMemo(() => {
    if (!profileDataState) return defaultProfile;
    return {
      ...defaultProfile,
      ...profileDataState,
      _id: profileDataState._id || defaultProfile._id,
      userId: (profileDataState.userId as Id<"users">) || defaultProfile.userId,
      gender:
        (profileDataState.gender as "male" | "female" | "other") || "other",
      createdAt: profileDataState.createdAt || Date.now(),
      updatedAt: profileDataState.updatedAt || Date.now(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(profileDataState)]); // Compare content of profileDataState

  // Profile update mutation using react-query
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!token)
        throw new Error("Authentication required. Please sign in again.");
      const updatedProfile = convertFormValuesToProfile(values, profileData);
      const result = await updateUserProfile(token, updatedProfile);
      if (!result.success) {
        throw new Error(result.error || "Profile update was not successful");
      }
      return result.data as Profile;
    },
    onSuccess: async (profile) => {
      setProfileDataState(profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
        queryClient.invalidateQueries({ queryKey: ["auth"] }),
      ]);
      await refetchProfile();
      toast.success("Profile updated successfully!");
      router.push("/profile");
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setServerError(errorMessage);
      toast.error(`Failed to update profile: ${errorMessage}`);
    },
  });

  // Form submit handler
  const handleProfileSubmit = useCallback(
    async (values: ProfileFormValues) => {
      setServerError(null);
      await updateProfileMutation.mutateAsync(values);
    },
    [updateProfileMutation]
  );

  // Wrapper for onSubmit to map values back to canonical shape
  const handleProfileFormComponentSubmit = useCallback(
    (values: ProfileFormComponentValues & { profileImageIds: string[] }) => {
      return handleProfileSubmit(fromProfileFormComponentValues(values));
    },
    [handleProfileSubmit]
  );

  const formValues = useMemo(
    () => convertProfileToFormValues(profileData),
    [JSON.stringify(profileData)]
  );

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isProfileError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* <XCircle className="h-5 w-5 text-red-500" /> */}
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {profileError instanceof Error
                  ? profileError.message
                  : "Failed to load profile data"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in state
  if (!isSignedIn && typeof window !== "undefined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Please Sign In
        </h2>
        <p className="text-gray-600 mb-6">
          You need to be signed in to view this page.
        </p>
        <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
      </div>
    );
  }

  // Main form
  return (
    <div className="py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <ProfileFormComponent
            mode="edit"
            initialValues={toProfileFormComponentValues(formValues)}
            onSubmit={handleProfileFormComponentSubmit}
            loading={updateProfileMutation.status === "pending"}
            serverError={serverError || undefined}
            onEditDone={() => router.push("/profile")}
            key={profileData?._id || "create"}
          />
        </div>
      </div>
    </div>
  );
}
