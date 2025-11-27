"use client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  Profile,
  ProfileFormValues,
  Gender,
  SmokingDrinking,
  Diet,
  PhysicalStatus,
} from "@/types/profile";
import ProfileEditSimpleForm from "@/components/profile/ProfileEditSimpleForm";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { getErrorMessage } from "@/lib/utils/apiResponse";
import {
  getCurrentUserWithProfile,
  submitProfile,
} from "@/lib/profile/userProfileApi";
import { mapProfileToFormValues } from "@/lib/profile/formMapping";
import type { ProfileFormValues as ProfileFormComponentValues } from "@/types/profile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import React from "react";

// Default profile data matching the Profile interface
const defaultProfile: Profile = {
  _id: "",
  userId: "",
  email: "",
  fullName: "",
  dateOfBirth: "",
  gender: "other",
  city: "",
  country: "",
  phoneNumber: "",
  aboutMe: "",
  height: "",
  maritalStatus: "single",
  education: "",
  occupation: "",
  annualIncome: "",
  diet: "vegetarian",
  smoking: "no",
  drinking: "no",
  physicalStatus: "normal",
  partnerPreferenceAgeMin: 18,
  partnerPreferenceAgeMax: 80,
  partnerPreferenceCity: [],
  preferredGender: "any",
  profileImageIds: [],

  banned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  profileFor: "self",

  subscriptionPlan: "free",
  boostsRemaining: 0,
};

// eslint-disable-next-line no-unused-vars
function convertFormValuesToProfile(
  formValues: ProfileFormValues,
  existingProfile: Partial<Profile> = {}
): Profile {
  // Remove _creationTime and _id from both formValues and existingProfile
  const cleanFormValues = Object.fromEntries(
    Object.entries(formValues).filter(
      ([k]) => k !== "_creationTime" && k !== "_id"
    )
  );
  const cleanExistingProfile = Object.fromEntries(
    Object.entries(existingProfile).filter(
      ([k]) => k !== "_creationTime" && k !== "_id"
    )
  );
  return {
    ...defaultProfile,
    ...cleanExistingProfile,
    ...cleanFormValues,
    gender: (formValues.gender as Gender) ?? "other",
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
    drinking: (formValues.drinking as SmokingDrinking) || "no",
    smoking: (formValues.smoking as SmokingDrinking) || "no",
    diet: (formValues.diet as Diet) || "vegetarian",
    physicalStatus: (formValues.physicalStatus as PhysicalStatus) || "normal",
    updatedAt: Date.now(),
  };
}

// Utility to map ProfileFormComponentValues (with string fields for arrays) back to canonical ProfileFormValues
function fromProfileFormComponentValues(
  values: ProfileFormComponentValues & { profileImageIds: string[] }
): ProfileFormValues & { profileImageIds: string[] } {
  // Remove _creationTime and _id from values
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([k]) => k !== "_creationTime" && k !== "_id")
  );
  return {
    ...cleanValues,
    fullName: values.fullName ?? "",
    dateOfBirth:
      (values.dateOfBirth as unknown) instanceof Date
        ? (values.dateOfBirth as unknown as Date).toISOString()
        : ((values.dateOfBirth as string) ?? ""),
    gender: values.gender ?? "other",
    height: values.height ?? "",
    city: values.city ?? "",
    country: values.country ?? "",
    phoneNumber: values.phoneNumber ?? "",
    aboutMe: values.aboutMe ?? "",
    maritalStatus: values.maritalStatus ?? "",
    education: values.education ?? "",
    occupation: values.occupation ?? "",
    annualIncome: values.annualIncome ?? "",
    diet: values.diet || "vegetarian",
    smoking: values.smoking || "no",
    drinking: values.drinking || "no",
    physicalStatus: values.physicalStatus || "healthy",
    partnerPreferenceAgeMin: values.partnerPreferenceAgeMin ?? "",
    partnerPreferenceAgeMax: values.partnerPreferenceAgeMax ?? "",
    partnerPreferenceCity: Array.isArray(values.partnerPreferenceCity)
      ? values.partnerPreferenceCity
      : typeof values.partnerPreferenceCity === "string"
        ? values.partnerPreferenceCity
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    preferredGender: values.preferredGender ?? "",
    profileImageIds: values.profileImageIds ?? [],
    profileFor: values.profileFor ?? "self",
    motherTongue: values.motherTongue ?? "",
    religion: values.religion ?? "",
    ethnicity: values.ethnicity ?? "",
  };
}

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile: rawAuthProfile, isSignedIn } = useAuthContext();
  const authProfile = rawAuthProfile as {
    _id?: string;
    userId?: string;
  } | null;
  const userId = user?.uid || authProfile?._id || authProfile?.userId || "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [profileDataState, setProfileDataState] = useState<Profile | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Memoize the query key to prevent unnecessary refetches
  const profileQueryKey = useMemo(() => ["profile", userId], [userId]);

  // Fetch profile data using token-based client (Authorization attached by client)
  const {
    data: profileApiData,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<Profile | null>({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const result = await getCurrentUserWithProfile(userId);
      return result.success ? (result.data as Profile) : null;
    },
    // Only run after auth hydration in token-based flow
    enabled: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Populate local state once the profile API returns data
  useEffect(() => {
    if (profileApiData) {
      // Flatten potential envelope shapes

      const envelope =
        (profileApiData as { data?: unknown })?.data ?? profileApiData;
      const envelopeWithProfile = envelope as {
        profile?: Partial<Profile>;
      } & Partial<Profile>;
      const combined: Partial<Profile> = {
        ...(envelope || {}),
        ...(envelopeWithProfile.profile || {}),
      };

      setProfileDataState(combined as Profile);
    }
  }, [profileApiData]);

  // Handle profile fetch error
  useEffect(() => {
    if (isProfileError) {
      console.error("Error fetching profile:", profileError);
      const errMsg =
        profileError instanceof Error
          ? profileError.message
          : "Failed to load profile data";
      showErrorToast(errMsg);
    }
  }, [isProfileError, profileError]);

  // Warn users about navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSaving) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);

  // Memoized profile data for type safety and consistency
  const profileDataStateString = JSON.stringify(profileDataState);
  const profileData: Profile = useMemo(() => {
    if (!profileDataState) return defaultProfile;

    // Filter out undefined/null values and ensure required fields are present
    const filtered = Object.fromEntries(
      Object.entries(profileDataState).filter(([, v]) => v !== undefined && v !== null)
    );

    return {
      ...defaultProfile,
      ...filtered,
      _id: profileDataState._id || defaultProfile._id,
      userId: (profileDataState.userId as string) || defaultProfile.userId,
      email: (profileDataState.email as string) || defaultProfile.email,
      fullName: (profileDataState.fullName as string) || defaultProfile.fullName,
      gender:
        (profileDataState.gender as "male" | "female" | "other") || "other",
      city: (profileDataState.city as string) || defaultProfile.city,
      country: (profileDataState.country as string) || defaultProfile.country,
      dateOfBirth: (profileDataState.dateOfBirth as string) || defaultProfile.dateOfBirth,
      phoneNumber: (profileDataState.phoneNumber as string) || defaultProfile.phoneNumber,
      aboutMe: (profileDataState.aboutMe as string) || defaultProfile.aboutMe,
      height: (profileDataState.height as string) || defaultProfile.height,
      maritalStatus: (profileDataState.maritalStatus as "single" | "divorced" | "widowed") || "single",
      education: (profileDataState.education as string) || defaultProfile.education,
      occupation: (profileDataState.occupation as string) || defaultProfile.occupation,
      annualIncome: (profileDataState.annualIncome as string) || defaultProfile.annualIncome,
      diet: (profileDataState.diet as Diet) || "vegetarian",
      smoking: (profileDataState.smoking as SmokingDrinking) || "no",
      drinking: (profileDataState.drinking as SmokingDrinking) || "no",
      physicalStatus: (profileDataState.physicalStatus as PhysicalStatus) || "normal",
      partnerPreferenceAgeMin: profileDataState.partnerPreferenceAgeMin || 18,
      partnerPreferenceAgeMax: profileDataState.partnerPreferenceAgeMax || 80,
      partnerPreferenceCity: (profileDataState.partnerPreferenceCity as string[]) || [],
      preferredGender: (profileDataState.preferredGender as "male" | "female" | "any") || "any",
      profileImageIds: (profileDataState.profileImageIds as string[]) || [],
      subscriptionPlan: (profileDataState.subscriptionPlan as "free" | "premium" | "premiumPlus") || "free",
      profileFor: (profileDataState.profileFor as "self" | "friend" | "family") || "self",
      createdAt: profileDataState.createdAt || Date.now(),
      updatedAt: profileDataState.updatedAt || Date.now(),
      motherTongue: (profileDataState.motherTongue as string) || "",
      religion: (profileDataState.religion as string) || "",
      ethnicity: (profileDataState.ethnicity as string) || "",
    };
  }, [profileDataStateString, profileDataState]); // Compare content of profileDataState

  // Profile update mutation using react-query
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      // Remove userId and _id before sending to API
      const {
        userId: _omitUserId, // eslint-disable-line no-unused-vars
        _id: _omitId, // eslint-disable-line no-unused-vars
        ...safeValues
      } = values;
      const apiResult = await submitProfile(userId, safeValues, "edit");
      if (!apiResult.success) {
        // Bubble up specific errors for better UX
        throw new Error(
          getErrorMessage(apiResult.error) ||
            "Profile update was not successful"
        );
      }
      return apiResult.data as Profile;
    },
    onSuccess: async (profile) => {
      setProfileDataState(profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
        queryClient.invalidateQueries({ queryKey: ["auth"] }),
      ]);
      await refetchProfile();
      showSuccessToast("Profile updated successfully!");
      router.push("/profile");
      setIsSaving(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setServerError(errorMessage);

      // Token expiry / unauthorized detection
      if (
        errorMessage.toLowerCase().includes("unauthorized") ||
        errorMessage.includes("401")
      ) {
        showErrorToast("Session expired. Please sign in again.");
      } else {
        showErrorToast(errorMessage);
      }
      setIsSaving(false);
    },
  });

  // Form submit handler
  const handleProfileSubmit = useCallback(
    async (values: ProfileFormValues) => {
      if (isSaving || updateProfileMutation.isPending) return; // duplicate guard

      // Basic age ≥ 18 validation
      try {
        const dob = new Date(values.dateOfBirth);
        const ageMs = Date.now() - dob.getTime();
        const age = new Date(ageMs).getUTCFullYear() - 1970;
        if (isNaN(age) || age < 18) {
          showErrorToast(
            "You must be at least 18 years old to edit your profile."
          );
          return;
        }
      } catch {
        showErrorToast("Please provide a valid date of birth.");
        return;
      }

      setIsSaving(true);

      try {
        await updateProfileMutation.mutateAsync(values);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, updateProfileMutation]
  );

  // Wrapper for onSubmit to map values back to canonical shape
  const handleProfileFormComponentSubmit = useCallback(
    (values: ProfileFormComponentValues) => {
      return handleProfileSubmit(
        fromProfileFormComponentValues(
          values as ProfileFormComponentValues & { profileImageIds: string[] }
        )
      );
    },
    [handleProfileSubmit]
  );

  // Main form
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">
          Loading profile...
        </span>
      </div>
    );
  }

  // Show loading if we don't have profile data but we're authenticated
  if (!profileData && isSignedIn && !isProfileError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">
          Loading profile data...
        </span>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <span className="ml-3 text-pink-700 font-semibold">
          Failed to load profile.
        </span>
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
      <div className="flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          Please Sign In
        </h2>
        <p className="text-neutral-600 mb-6">
          You need to be signed in to view this page.
        </p>
        <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-white flex flex-col py-10 px-4 md:px-8 overflow-hidden">
      {/* Decorative pink circle background */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-pink-300 rounded-full opacity-30 blur-3xl" />

      {/* Page title with pink wavy underline */}
      <div className="relative w-fit mx-auto mb-8 z-10">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-2 text-left">
          Edit Profile
        </h1>
        <svg
          viewBox="0 0 200 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-0 top-full w-[140px] sm:w-[200px] h-[12px]"
        >
          <path
            d="M2 6c40-8 80 8 120 0s38-8 76 0"
            stroke="#EC4899"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex justify-center z-10">
        <div className="w-full max-w-3xl bg-white shadow-xl rounded-xl p-6 md:p-8">
          <ProfileEditSimpleForm
            initialValues={mapProfileToFormValues(profileData)}
            onSubmit={handleProfileFormComponentSubmit}
            loading={updateProfileMutation.status === "pending"}
            serverError={serverError || undefined}
            key={profileData._id}
          />
        </div>
      </div>
    </div>
  );
}
