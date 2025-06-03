"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { ProfileFormValues, Profile } from "@/types/profile";
import type { ProfileFormValues as FormProfileFormValues } from "@/components/profile/ProfileForm";
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
    fullName: profile.fullName || "",
    dateOfBirth: profile.dateOfBirth || "",
    gender: profile.gender || "",
    ukCity: profile.ukCity || "",
    ukPostcode: profile.ukPostcode || "",
    phoneNumber: profile.phoneNumber || "",
    aboutMe: profile.aboutMe || "",
    religion: profile.religion || "",
    caste: profile.caste || "",
    motherTongue: profile.motherTongue || "",
    height: profile.height || "",
    maritalStatus: profile.maritalStatus || "",
    education: profile.education || "",
    occupation: profile.occupation || "",
    annualIncome: profile.annualIncome || "",
    diet: profile.diet || "",
    smoking: profile.smoking || "",
    drinking: profile.drinking || "",
    physicalStatus: profile.physicalStatus || "",
    partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin || "",
    partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax || "",
    partnerPreferenceReligion: profile.partnerPreferenceReligion || [],
    partnerPreferenceUkCity: profile.partnerPreferenceUkCity || [],
    preferredGender: profile.preferredGender || "",
    profileImageIds: profile.profileImageIds || [],
    isProfileComplete: profile.isProfileComplete,
    hiddenFromSearch: profile.hiddenFromSearch,
    banned: profile.banned,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function convertFormValuesToProfile(
  formValues: ProfileFormValues,
  existingProfile: Partial<Profile> = {}
): Profile {
  // Ensure numeric fields are properly handled
  const annualIncome =
    formValues.annualIncome !== undefined
      ? typeof formValues.annualIncome === "string"
        ? parseFloat(formValues.annualIncome) || 0
        : formValues.annualIncome
      : 0;

  const partnerPreferenceAgeMin =
    typeof formValues.partnerPreferenceAgeMin === "number"
      ? formValues.partnerPreferenceAgeMin
      : typeof formValues.partnerPreferenceAgeMin === "string"
        ? parseInt(formValues.partnerPreferenceAgeMin, 10) || 18
        : 18;
  const partnerPreferenceAgeMax =
    typeof formValues.partnerPreferenceAgeMax === "number"
      ? formValues.partnerPreferenceAgeMax
      : typeof formValues.partnerPreferenceAgeMax === "string"
        ? parseInt(formValues.partnerPreferenceAgeMax, 10) || 80
        : 80;

  // Ensure maritalStatus is one of the allowed values
  const maritalStatus =
    formValues.maritalStatus === "single" ||
    formValues.maritalStatus === "divorced" ||
    formValues.maritalStatus === "widowed"
      ? formValues.maritalStatus
      : "single";

  // Ensure preferredGender is one of the allowed values
  const preferredGender =
    formValues.preferredGender === "male" ||
    formValues.preferredGender === "female" ||
    formValues.preferredGender === "any"
      ? formValues.preferredGender
      : "any";

  // Ensure gender is one of the allowed values
  const gender: "male" | "female" | "other" =
    formValues.gender === "male" ||
    formValues.gender === "female" ||
    formValues.gender === "other"
      ? formValues.gender
      : "other";

  return {
    ...defaultProfile,
    ...existingProfile,
    ...formValues,
    maritalStatus,
    preferredGender,
    gender,
    annualIncome: annualIncome.toString(), // Convert to string to match Profile type
    height: formValues.height?.toString() || "",
    partnerPreferenceAgeMin,
    partnerPreferenceAgeMax,
    isProfileComplete: true,
    updatedAt: Date.now(),
    userId: (formValues.userId as Id<"users">) || defaultProfile.userId,
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
    async (values: FormProfileFormValues & { profileImageIds: string[] }) => {
      setServerError(null);
      await updateProfileMutation.mutateAsync(
        values as unknown as ProfileFormValues
      );
    },
    [updateProfileMutation]
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
            initialValues={formValues as Partial<FormProfileFormValues>}
            onSubmit={handleProfileSubmit}
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
