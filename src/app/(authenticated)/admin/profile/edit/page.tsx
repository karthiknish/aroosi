"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  fetchAdminProfileById,
  updateAdminProfileById,
  fetchAdminProfileImagesById,
} from "@/lib/profile/adminProfileApi";
import type { Profile, ProfileEditFormState } from "@/types/profile";
import { useQuery } from "@tanstack/react-query";
import type { ApiImage } from "@/lib/utils/profileImageUtils";
import type { ImageType } from "@/types/image";
import ProfileEditForm from "@/components/admin/ProfileEditForm";

export default function AdminEditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const {
    token,
    isLoaded: authIsLoaded,
    isSignedIn,
    isAdmin,
  } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({});
  const [fetchedImages, setFetchedImages] = useState<ImageType[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Fetch the profile by id
  const { data: profileData, isLoading } = useQuery<Profile | null>({
    queryKey: ["adminProfile", id, token],
    queryFn: async () => {
      if (!id || !token) return null;
      return await fetchAdminProfileById({ token, id });
    },
    enabled: !!id && !!token,
  });

  // Fetch admin images for the profile being edited
  useEffect(() => {
    const fetchImages = async () => {
      if (profileData && token) {
        const raw = await fetchAdminProfileImagesById({
          token,
          profileId: profileData._id,
        });
        const apiImages: ApiImage[] = Array.isArray(raw)
          ? (raw as unknown as ApiImage[])
          : [];
        setFetchedImages(
          apiImages.map((img) => ({
            id: img._id || img.storageId,
            url: img.url,
            storageId: img.storageId,
          }))
        );
      } else {
        setFetchedImages([]);
      }
    };
    fetchImages();
  }, [profileData, token]);

  // Initialize form state from profile
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
      setEditForm({
        ...profileData,
        partnerPreferenceReligion: Array.isArray(
          profileData.partnerPreferenceReligion
        )
          ? profileData.partnerPreferenceReligion
          : [],
        partnerPreferenceUkCity: Array.isArray(
          profileData.partnerPreferenceUkCity
        )
          ? profileData.partnerPreferenceUkCity
          : [],
        profileImageIds: Array.isArray(profileData.profileImageIds)
          ? profileData.profileImageIds
          : [],
      });
    }
  }, [profileData]);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string | undefined) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle images changed
  const handleImagesChanged = (newImageIds: string[]) => {
    setEditForm((prev) => ({ ...prev, profileImageIds: newImageIds }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !id) return;
    setIsSubmitting(true);
    try {
      const updates = {
        ...editForm,
        partnerPreferenceAgeMin: Number(editForm.partnerPreferenceAgeMin),
        partnerPreferenceAgeMax: Number(editForm.partnerPreferenceAgeMax),
        annualIncome:
          typeof editForm.annualIncome === "string"
            ? Number(editForm.annualIncome)
            : editForm.annualIncome,
        partnerPreferenceReligion: Array.isArray(
          editForm.partnerPreferenceReligion
        )
          ? editForm.partnerPreferenceReligion
          : typeof editForm.partnerPreferenceReligion === "string"
            ? (editForm.partnerPreferenceReligion as string)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
        partnerPreferenceUkCity: Array.isArray(editForm.partnerPreferenceUkCity)
          ? editForm.partnerPreferenceUkCity
          : typeof editForm.partnerPreferenceUkCity === "string"
            ? (editForm.partnerPreferenceUkCity as string)
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
        preferredGender: (["male", "female", "any"].includes(
          editForm.preferredGender as string
        )
          ? editForm.preferredGender
          : "any") as "male" | "female" | "any",
        maritalStatus: (["single", "divorced", "widowed"].includes(
          editForm.maritalStatus as string
        )
          ? editForm.maritalStatus
          : "single") as "single" | "divorced" | "widowed",
      };
      await updateAdminProfileById({
        token: token!,
        id,
        updates,
      });
      toast.success("Profile updated successfully");
      router.push("/admin");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(
        error instanceof Error
          ? error.message || "Failed to update profile"
          : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authIsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return null;
  }

  if (isLoading || !editForm || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
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
          profile={profile}
          editForm={editForm}
          onInputChange={handleInputChange}
          onSelectChange={handleSelectChange}
          onSubmit={handleSubmit}
          loading={isSubmitting}
          onImagesChanged={handleImagesChanged}
          fetchedImages={fetchedImages}
        />
      </div>
    </div>
  );
}
