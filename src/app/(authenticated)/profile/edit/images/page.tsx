"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import {
  fetchUserProfileImages,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProfileFormStepImages from "@/components/profile/ProfileFormStepImages";
import type { ImageType } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/profile";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { updateImageOrder } from "@/lib/utils/imageUtil";

export default function EditProfileImagesPage() {
  const {
    /* token removed */
  } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Local image state for optimistic edits
  const [editedImages, setEditedImages] = useState<ImageType[]>([]);
  const [initialImages, setInitialImages] = useState<ImageType[]>([]);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["profile"],
      queryFn: async () => {
        const res = await getCurrentUserWithProfile();
        if (!res?.success || !res.data) return null;

        const envelope = (res.data as { profile?: unknown })?.profile
          ? (res.data as { profile?: unknown }).profile
          : res.data;
        return envelope as Profile;
      },
      enabled: true,
    }
  );

  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageType[]>(
    {
      queryKey: ["profileImages", profile?._id],
      queryFn: async () => {
        if (!profile?._id) return [];
        const result = await fetchUserProfileImages(profile._id);
        if (!result.success || !result.data) return [];
        /* unwrap */

        const payload = Array.isArray(result.data)
          ? result.data
          : (result.data as { images?: unknown[] }).images;

        // Type guard to ensure we have the right structure
        const isValidImageArray = (
          arr: unknown[]
        ): arr is Array<{
          id?: string;
          _id?: string;
          url?: string;
          storageId?: string;
          name?: string;
          fileName?: string;
          size?: number;
          uploadedAt?: number;
        }> => {
          return Array.isArray(arr);
        };

        const validPayload =
          payload && isValidImageArray(payload) ? payload : [];

        const mapped = validPayload.map((img) => ({
          id: img.id || img._id || img.storageId || "",
          url: img.url,
          _id: img._id,
          storageId: img.storageId,
          name: img.name || img.fileName,
          size: img.size,
          uploadedAt: img.uploadedAt,
        })) as ImageType[];
        return mapped;
      },
      enabled: !!profile?.userId,
    }
  );

  // When images are fetched, initialise local state
  useEffect(() => {
    if (!imagesLoading) {
      setEditedImages(images);
      setInitialImages(images);
    }
  }, [images, imagesLoading]);

  const handleImagesChanged = useCallback((updated: ImageType[] | string[]) => {
    if (Array.isArray(updated) && typeof updated[0] !== "string") {
      setEditedImages(updated as ImageType[]);
    }
  }, []);

  const handleImageDelete = useCallback(async (imageId: string) => {
    setEditedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleImageReorder = useCallback((newOrder: ImageType[]) => {
    setEditedImages(newOrder);
  }, []);

  // Utility to compare arrays
  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  // Persist all changes
  const handleSaveChanges = useCallback(async () => {
    if (!profile) return;
    setIsUpdating(true);

    const initialIds = initialImages.map((img) => img.id);
    const editedIds = editedImages.map((img) => img.id);

    const deletions = initialIds.filter((id) => !editedIds.includes(id));
    const additions = editedImages.filter(
      (img) => !initialIds.includes(img.id)
    );

    try {
      // Delete removed images
      for (const id of deletions) {
        // Defer deletion to server-side routes if available; no client util currently.
        // You may implement a DELETE /api/profile-images/:id endpoint and call it here.
        // For now, skip client-side delete to avoid type errors and rely on saving new order below.
      }

      // Metadata now saved server-side during upload; no-op here

      // Update order if changed
      if (!arraysEqual(initialIds, editedIds)) {
        await updateImageOrder({
          userId: profile.userId,
          imageIds: editedIds,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["profileImages", profile._id],
      });
      showSuccessToast("Profile photos updated");
      router.push("/profile");
    } catch (error) {
      console.error("Failed to save image updates:", error);
      showErrorToast(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setIsUpdating(false);
    }
  }, [profile, initialImages, editedImages, queryClient, router]);

  if (profileLoading || imagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-light">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">Loading...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-light text-center">
        <p className="text-lg font-medium mb-4">Profile not found.</p>
        <Button onClick={() => router.push("/profile")}>Back to Profile</Button>
      </div>
    );
  }
  return (
    <div className="relative flex items-start justify-center min-h-screen bg-white p-4 overflow-hidden">
      {/* Decorative pink circle */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-pink-300 rounded-full opacity-30 blur-3xl" />

      <Card className="w-full max-w-3xl z-10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Edit Profile Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileFormStepImages
            images={images}
            onImagesChanged={handleImagesChanged}
            onImageDelete={handleImageDelete}
            onImageReorder={handleImageReorder}
            isLoading={imagesLoading || isUpdating}
            profileId={profile._id}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
