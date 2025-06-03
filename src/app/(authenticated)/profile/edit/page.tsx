"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Profile } from "@/types/profile";
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
type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say" | "other";

function convertProfileToFormValues(
  profile: Partial<Profile>
): FormProfileFormValues {
  return {
    fullName: String(profile.fullName ?? ""),
    dateOfBirth: String(profile.dateOfBirth ?? ""),
    gender: (profile.gender as Gender) || "other",
    height: String(profile.height ?? ""),
    ukCity: String(profile.ukCity ?? ""),
    aboutMe: String(profile.aboutMe ?? ""),
    phoneNumber: String(profile.phoneNumber ?? ""),
    preferredGender: String(profile.preferredGender ?? ""),
    partnerPreferenceAgeMin: String(profile.partnerPreferenceAgeMin ?? ""),
    partnerPreferenceAgeMax: String(profile.partnerPreferenceAgeMax ?? ""),
    partnerPreferenceReligion: Array.isArray(profile.partnerPreferenceReligion)
      ? profile.partnerPreferenceReligion.join(", ")
      : String(profile.partnerPreferenceReligion ?? ""),
    partnerPreferenceUkCity: Array.isArray(profile.partnerPreferenceUkCity)
      ? profile.partnerPreferenceUkCity.join(", ")
      : String(profile.partnerPreferenceUkCity ?? ""),
    religion: String(profile.religion ?? ""),
    caste: String(profile.caste ?? ""),
    motherTongue: String(profile.motherTongue ?? ""),
    maritalStatus: String(profile.maritalStatus ?? ""),
  };
}

function convertFormValuesToProfile(
  formValues: FormProfileFormValues,
  existingProfile: Partial<Profile> = {}
): Profile {
  const partnerPreferenceReligion =
    typeof formValues.partnerPreferenceReligion === "string"
      ? formValues.partnerPreferenceReligion
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  const partnerPreferenceUkCity =
    typeof formValues.partnerPreferenceUkCity === "string"
      ? formValues.partnerPreferenceUkCity
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  return {
    ...defaultProfile,
    ...existingProfile,
    ...formValues,
    gender: (formValues.gender as Gender) || "other",
    partnerPreferenceAgeMin: formValues.partnerPreferenceAgeMin
      ? parseInt(formValues.partnerPreferenceAgeMin, 10)
      : 18,
    partnerPreferenceAgeMax: formValues.partnerPreferenceAgeMax
      ? parseInt(formValues.partnerPreferenceAgeMax, 10)
      : 80,
    partnerPreferenceReligion,
    partnerPreferenceUkCity,
    preferredGender: (["male", "female", "any"].includes(
      formValues.preferredGender
    )
      ? formValues.preferredGender
      : "any") as "male" | "female" | "any",
    maritalStatus: (["single", "divorced", "widowed"].includes(
      formValues.maritalStatus
    )
      ? formValues.maritalStatus
      : "single") as "single" | "divorced" | "widowed",
    height: formValues.height?.toString() || "",
    aboutMe: formValues.aboutMe || "",
    phoneNumber: formValues.phoneNumber || "",
    dateOfBirth:
      typeof formValues.dateOfBirth === "string"
        ? formValues.dateOfBirth
        : (formValues.dateOfBirth as Date)?.toISOString() || "",
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
    mutationFn: async (values: FormProfileFormValues) => {
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
        values as unknown as FormProfileFormValues
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
