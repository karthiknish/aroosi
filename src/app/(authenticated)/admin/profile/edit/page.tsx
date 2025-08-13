"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  fetchAdminProfileById,
  updateAdminProfileById,
  fetchAdminProfileImagesById,
  fetchAdminProfileMatches,
} from "@/lib/profile/adminProfileApi";
import type { Profile } from "@/types/profile";
import { useQuery } from "@tanstack/react-query";
import type { ProfileFormValues } from "@/types/profile";
import ProfileEditForm from "@/components/admin/ProfileEditForm";
import type { ImageType } from "@/types/image";

function AdminEditProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { isLoaded: authIsLoaded, isSignedIn, isAdmin } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Image state for admin profile images
  const [images, setImages] = useState<ImageType[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Fetch the profile by id
  const { data: profileData, isLoading } = useQuery<Profile | null>({
    queryKey: ["adminProfile", id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchAdminProfileById({ id });
    },
    enabled: !!id,
  });

  // Fetch matches for profile
  const { data: matches } = useQuery<Profile[]>({
    queryKey: ["profileMatches", id],
    queryFn: async () => {
      if (!id) return [];
      return await fetchAdminProfileMatches({ profileId: id });
    },
    enabled: !!id,
  });

  // Initialize form state from profile
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData]);

  // Fetch images when profile and token are available
  useEffect(() => {
    const profileId: string = profile?._id || id || "";
    if (!profileId) return;
    setImagesLoading(true);
    fetchAdminProfileImagesById({ profileId })
      .then((imgs) => setImages(imgs.filter((img) => !!img && !!img.url)))
      .catch(() => {
        // Optionally handle error here if you want to show a toast
        // showErrorToast(null, "Failed to load images");
      })
      .finally(() => setImagesLoading(false));
  }, [profile?._id, id]);

  // Admin profile update handler
  const handleAdminProfileUpdate = async (values: ProfileFormValues) => {
    if (!id) return;
    // Map maritalStatus to correct union type
    const allowedStatuses = [
      "single",
      "divorced",
      "widowed",
      "annulled",
    ] as const;
    const maritalStatus = allowedStatuses.includes(
      values.maritalStatus as string as (typeof allowedStatuses)[number]
    )
      ? (values.maritalStatus as (typeof allowedStatuses)[number])
      : "single";
    // Convert types for backend compatibility
    const partnerPreferenceAgeMin =
      typeof values.partnerPreferenceAgeMin === "string"
        ? parseInt(values.partnerPreferenceAgeMin, 10)
        : values.partnerPreferenceAgeMin;
    const partnerPreferenceAgeMax =
      typeof values.partnerPreferenceAgeMax === "string"
        ? parseInt(values.partnerPreferenceAgeMax, 10)
        : values.partnerPreferenceAgeMax;
    const annualIncome =
      typeof values.annualIncome === "string"
        ? parseFloat(values.annualIncome)
        : values.annualIncome;
    const allowedGenders = ["male", "female", "any", ""] as const;
    const preferredGender = allowedGenders.includes(
      values.preferredGender as string as (typeof allowedGenders)[number]
    )
      ? (values.preferredGender as (typeof allowedGenders)[number])
      : "any";

    // Map gender to correct union type
    const allowedGenderTypes = ["male", "female", "other"] as const;
    const gender = allowedGenderTypes.includes(
      values.gender as string as (typeof allowedGenderTypes)[number]
    )
      ? (values.gender as (typeof allowedGenderTypes)[number])
      : "other";

    // Map diet to correct union type
    const allowedDiets = [
      "vegetarian",
      "non-vegetarian",
      "vegan",
      "eggetarian",
      "other",
      "",
    ] as const;
    const diet = allowedDiets.includes(
      values.diet as string as (typeof allowedDiets)[number]
    )
      ? (values.diet as (typeof allowedDiets)[number])
      : "";

    // Map smoking to correct union type
    const allowedSmokingDrinking = ["no", "occasionally", "yes", ""] as const;
    const smoking = allowedSmokingDrinking.includes(
      values.smoking as string as (typeof allowedSmokingDrinking)[number]
    )
      ? (values.smoking as (typeof allowedSmokingDrinking)[number])
      : "";

    // Map drinking to correct union type
    const drinking = allowedSmokingDrinking.includes(
      values.drinking as string as (typeof allowedSmokingDrinking)[number]
    )
      ? (values.drinking as (typeof allowedSmokingDrinking)[number])
      : "";

    // Map physicalStatus to correct union type
    const allowedPhysicalStatus = [
      "normal",
      "differently-abled",
      "other",
      "",
    ] as const;
    const physicalStatus = allowedPhysicalStatus.includes(
      values.physicalStatus as string as (typeof allowedPhysicalStatus)[number]
    )
      ? (values.physicalStatus as (typeof allowedPhysicalStatus)[number])
      : "";

    const updates = {
      ...values,
      gender,
      diet,
      smoking,
      drinking,
      physicalStatus,
      maritalStatus,
      partnerPreferenceAgeMin,
      partnerPreferenceAgeMax,
      annualIncome,
      preferredGender,
    };
    try {
      await updateAdminProfileById({ id, updates });
      showSuccessToast("Profile updated successfully!");
      router.push(`/admin/profile/[id]?id=${id}`);
    } catch (error) {
      showErrorToast(
        null,
        (error as Error).message || "Failed to update profile"
      );
    }
  };

  if (!authIsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return null;
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded shadow max-w-xl mx-auto text-center">
          <strong>Error:</strong> Profile not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/profile")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile Management
          </Button>
        </div>
        <ProfileEditForm
          initialValues={profile}
          onSubmit={handleAdminProfileUpdate}
          profileId={profile?._id || id || ""}
          images={images}
          setImages={setImages}
          imagesLoading={imagesLoading}
          matches={matches || []}
        />
      </div>
    </div>
  );
}

export default function AdminEditProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner size={32} />}>
      <AdminEditProfilePageInner />
    </Suspense>
  );
}
