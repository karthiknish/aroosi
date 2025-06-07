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
import {
  ProfileFormValues as ProfileFormComponentValues,
  mapProfileToFormValues,
} from "@/components/profile/ProfileForm";
import { fetchAdminProfileImagesById } from "@/lib/profile/adminProfileApi";
import type { ApiImage, MappedImage } from "@/lib/utils/profileImageUtils";
import { Loader2 } from "lucide-react";
import { ImageType } from "@/types/image";

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
  partnerPreferenceUkCity: [],
  preferredGender: "any",
  profileImageIds: [],
  isProfileComplete: false,
  isOnboardingComplete: false,
  hiddenFromSearch: false,
  banned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  profileFor: "self",
  isApproved: false,
};

function convertFormValuesToProfile(
  formValues: ProfileFormValues,
  existingProfile: Partial<Profile> = {}
): Profile {
  // Remove _creationTime, _id, and clerkId from both formValues and existingProfile
  const cleanFormValues = Object.fromEntries(
    Object.entries(formValues).filter(
      ([k]) => k !== "_creationTime" && k !== "_id" && k !== "clerkId"
    )
  );
  const cleanExistingProfile = Object.fromEntries(
    Object.entries(existingProfile).filter(
      ([k]) => k !== "_creationTime" && k !== "_id" && k !== "clerkId"
    )
  );
  return {
    ...defaultProfile,
    ...cleanExistingProfile,
    ...cleanFormValues,
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
    drinking: formValues.drinking || "no",
    smoking: formValues.smoking || "no",
    diet: formValues.diet || "vegetarian",
    physicalStatus: formValues.physicalStatus || "healthy",
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
      values.dateOfBirth instanceof Date
        ? values.dateOfBirth.toISOString()
        : ((values.dateOfBirth as string) ?? ""),
    gender: values.gender ?? "other",
    height: values.height ?? "",
    ukCity: values.ukCity ?? "",
    ukPostcode: values.ukPostcode ?? "",
    phoneNumber: values.phoneNumber ?? "",
    aboutMe: values.aboutMe ?? "",
    motherTongue: values.motherTongue ?? "",
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
    partnerPreferenceUkCity: Array.isArray(values.partnerPreferenceUkCity)
      ? values.partnerPreferenceUkCity
      : typeof values.partnerPreferenceUkCity === "string"
        ? values.partnerPreferenceUkCity
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    preferredGender: values.preferredGender ?? "",
    profileImageIds: values.profileImageIds ?? [],
    profileFor: values.profileFor ?? "self",
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
      // Remove _id and clerkId from values before conversion
      const rest = Object.fromEntries(
        Object.entries(values).filter(([k]) => k !== "_id" && k !== "clerkId")
      );
      const updatedProfile = convertFormValuesToProfile(
        rest as ProfileFormValues,
        profileData
      );
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

  // Determine if the user is an admin (adjust this logic as needed)
  const isAdmin = authProfile?.role === "admin";

  // Fetch admin images if admin
  const [adminImages, setAdminImages] = useState<MappedImage[]>([]);
  useEffect(() => {
    const fetchImages = async () => {
      if (isAdmin && profileData?._id && token) {
        const raw = await fetchAdminProfileImagesById({
          token,
          profileId: profileData._id,
        });
        const apiImages: ApiImage[] = Array.isArray(raw)
          ? (raw as ImageType[]).map((img) => ({
              _id: img.id,
              storageId: img.storageId || img.id,
              url: img.url,
            }))
          : [];
        const mapped: MappedImage[] = apiImages.map((img) => ({
          _id: img._id || img.storageId,
          storageId: img.storageId,
          url: img.url,
        }));
        setAdminImages(mapped);
      } else {
        setAdminImages([]);
      }
    };
    fetchImages();
  }, [isAdmin, profileData?._id, token]);

  // Fetch user images (not admin)
  const userProfileId = profileData?._id;
  const { data: userImagesRaw = [] } = useQuery({
    queryKey: ["profile-images", userProfileId],
    queryFn: async () => {
      if (!token || !userProfileId) return [];
      const response = await fetch(
        `/api/profile-detail/${userProfileId}/images`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch profile images");
      const data = await response.json();
      return Array.isArray(data)
        ? (data as unknown as ApiImage[])
        : Array.isArray(data.images)
          ? (data.images as unknown as ApiImage[])
          : [];
    },
    enabled: !!token && !!userProfileId && !isAdmin,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userImages: MappedImage[] = userImagesRaw.map((img: any) => ({
    _id: img._id || img.storageId,
    storageId: img.storageId,
    url: img.url,
  }));

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
  if (!profileData || !profileData._id) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin w-8 h-8 text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-base-light">
      <div className="bg-white/90 shadow-xl rounded-2xl mt-16 w-full  overflow-hidden">
        <div className="px-4 py-8 sm:p-10">
          <ProfileFormComponent
            mode="edit"
            initialValues={mapProfileToFormValues(profileData)}
            onSubmit={handleProfileFormComponentSubmit}
            loading={updateProfileMutation.status === "pending"}
            serverError={serverError || undefined}
            onEditDone={() => router.push("/profile")}
            key={profileData._id}
            isAdmin={isAdmin}
            profileId={profileData._id}
            adminImages={adminImages as unknown as MappedImage[]}
            userImages={!isAdmin ? userImages : undefined}
          />
        </div>
      </div>
    </div>
  );
}
