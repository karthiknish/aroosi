"use client";

import React, { useCallback, useState } from "react";
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
import { deleteImageById, updateImageOrder } from "@/lib/utils/imageUtil";

 

export default function EditProfileImagesPage() {
  const { token } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["profile", token],
      queryFn: async () => {
        if (!token) return null;
        const res = await getCurrentUserWithProfile(token);
        if (!res.success || !res.data) return null;
        // unwrap

        const envelope = (res.data as { profile?: unknown })?.profile
          ? (res.data as { profile?: unknown }).profile
          : res.data;
        return envelope as Profile;
      },
      enabled: !!token,
    }
  );

  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageType[]>(
    {
      queryKey: ["profileImages", token, profile?._id],
      queryFn: async () => {
        if (!token || !profile?._id) return [];
        const result = await fetchUserProfileImages(token, profile._id);
        if (!result.success || !result.data) return [];
        /* unwrap */

        const payload = Array.isArray(result.data)
          ? result.data
          : (result.data as { images?: unknown[] }).images;

        // Type guard to ensure we have the right structure
        const isValidImageArray = (arr: unknown[]): arr is Array<{ id?: string; _id?: string; url?: string; storageId?: string; name?: string; fileName?: string; size?: number; uploadedAt?: number }> => {
          return Array.isArray(arr);
        };

        const validPayload = payload && isValidImageArray(payload) ? payload : [];
        
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
      enabled: !!token && !!profile?.userId,
    }
  );

  // Handle image changes (for upload notifications)
  const handleImagesChanged = useCallback(() => {
    // This will be called when images are uploaded/changed
    // Refetch the images to get the latest state
    queryClient.invalidateQueries({ queryKey: ["profileImages", token, profile?._id] });
  }, [queryClient, token, profile?._id]);

  // Handle image deletion
  const handleImageDelete = useCallback(async (imageId: string) => {
    if (!token || !profile?.userId) return;
    
    setIsUpdating(true);
    try {
      await deleteImageById({ token, userId: profile.userId, imageId });
      // Invalidate queries to refresh the image list
      await queryClient.invalidateQueries({ queryKey: ["profileImages", token, profile._id] });
      showSuccessToast("Image deleted successfully");
    } catch (error) {
      console.error("Failed to delete image:", error);
      showErrorToast(error instanceof Error ? error.message : "Failed to delete image");
    } finally {
      setIsUpdating(false);
    }
  }, [token, profile?.userId, profile?._id, queryClient]);

  // Handle image reordering
  const handleImageReorder = useCallback(async (newOrder: ImageType[]) => {
    if (!token || !profile?._id) return;
    
    setIsUpdating(true);
    try {
      const imageIds = newOrder.map(img => img.id);
      await updateImageOrder({
        token,
        profileId: profile._id,
        imageIds,
      });

      // Invalidate queries to refresh the image list
      await queryClient.invalidateQueries({ queryKey: ["profileImages", token, profile._id] });
      showSuccessToast("Image order updated successfully");
    } catch (error) {
      console.error("Failed to reorder images:", error);
      showErrorToast(error instanceof Error ? error.message : "Failed to reorder images");
    } finally {
      setIsUpdating(false);
    }
  }, [token, profile?._id, queryClient]);

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
            <Button onClick={() => router.push("/profile")}>Done</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
