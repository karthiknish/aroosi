"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";
import { useProfileImages } from "@/hooks/useProfileImages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProfileFormStepImages from "@/components/profile/ProfileFormStepImages";
import type { ImageType } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/profile";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "@/lib/ui/toast";
import { updateImageOrder } from "@/lib/utils/imageUtil";

export default function EditProfileImagesPage() {
  const { user, profile: authProfile } = useAuthContext();
  const userId =
    user?.uid ||
    (authProfile as any)?._id ||
    (authProfile as any)?.userId ||
    "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Local image state for optimistic edits
  const [editedImages, setEditedImages] = useState<ImageType[]>([]);
  const [initialImages, setInitialImages] = useState<ImageType[]>([]);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["profile", userId],
      queryFn: async () => {
        if (!userId) return null;
        const res = await getCurrentUserWithProfile(userId);
        if (!res?.success || !res.data) return null;
        const envelope = (res.data as { profile?: unknown })?.profile
          ? (res.data as { profile?: unknown }).profile
          : res.data;
        return envelope as Profile;
      },
      enabled: !!userId,
    }
  );

  const profileUserId = profile?.userId || (profile as any)?._id;
  const { images: rawImages, loading: imagesLoading } = useProfileImages({
    userId: profileUserId,
    enabled: !!profileUserId,
    preferInlineUrls: profile?.profileImageUrls,
  });
  const images: ImageType[] = rawImages.map((img) => ({
    id: img.storageId || img.url,
    url: img.url,
    storageId: img.storageId,
  })) as ImageType[];

  // When images are fetched, initialise local state
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!imagesLoading && !initializedRef.current) {
      setEditedImages(images);
      setInitialImages(images);
      initializedRef.current = true;
    }
  }, [images, imagesLoading]);

  const handleImagesChanged = useCallback((updated: ImageType[] | string[]) => {
    if (Array.isArray(updated) && typeof updated[0] !== "string") {
      setEditedImages(updated as ImageType[]);
    }
  }, []);

  const handleImageDelete = useCallback(
    async (imageId: string) => {
      // Optimistic removal
      setEditedImages((prev) =>
        prev.filter((img) => (img.storageId || img.id) !== imageId)
      );
      const target = editedImages.find(
        (i) => (i.storageId || i.id) === imageId
      );
      try {
        if (!target) return;
        const storageId = target.storageId || target.id;
        const res = await fetch(
          `/api/profile-images/firebase?storageId=${encodeURIComponent(storageId)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok) {
          throw new Error(
            (await res.json().catch(() => ({}))).error || `HTTP ${res.status}`
          );
        }
        showInfoToast("Photo deleted");
        // Invalidate caches
        queryClient.invalidateQueries({
          queryKey: ["profileImages", profileUserId],
        });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      } catch (e: any) {
        showErrorToast(e?.message || "Failed to delete photo");
        // Rollback if failure
        setEditedImages((prev) => {
          if (prev.some((i) => (i.storageId || i.id) === imageId)) return prev; // already back
          return [...prev, ...(target ? [target] : [])];
        });
      }
    },
    [editedImages, profileUserId, queryClient, userId]
  );

  const handleImageReorder = useCallback((newOrder: ImageType[]) => {
    setEditedImages(newOrder);
  }, []);

  // Utility to compare arrays + derived change flags
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };
  const normalizeIds = (arr: ImageType[]) =>
    arr.map((img) => img.storageId || img.id);
  const initialIds = normalizeIds(initialImages);
  const editedIds = normalizeIds(editedImages);
  const hasOrderChange = !arraysEqual(initialIds, editedIds);
  const hasDeletions = initialIds.some((id) => !editedIds.includes(id));
  const hasAdditions = editedIds.some((id) => !initialIds.includes(id));
  const hasChanges = hasOrderChange || hasDeletions || hasAdditions;

  // Warn on unload if unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges || isUpdating || isAutoSaving) return;
      e.preventDefault();
      e.returnValue = "You have unsaved photo changes.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges, isUpdating, isAutoSaving]);

  // Debounced auto-save for pure reorder changes (no adds/deletes)
  useEffect(() => {
    if (!profile) return;
    if (!hasOrderChange) return;
    if (hasAdditions || hasDeletions) return; // require manual save when structural change
    if (isUpdating) return;
    setIsAutoSaving(true);
    const t = setTimeout(async () => {
      try {
        await updateImageOrder({ userId: profileUserId, imageIds: editedIds });
        setInitialImages(editedImages); // accept baseline
        queryClient.invalidateQueries({
          queryKey: ["profileImages", profile._id],
        });
        showInfoToast("Order auto-saved");
      } catch (e: any) {
        showErrorToast(e?.message || "Failed to auto-save order");
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [
    hasOrderChange,
    hasAdditions,
    hasDeletions,
    editedIds,
    editedImages,
    profile,
    profileUserId,
    isUpdating,
    queryClient,
  ]);

  // Persist all changes
  const handleSaveChanges = useCallback(async () => {
    if (!profile) return;
    if (!hasChanges) {
      showInfoToast("No changes to save");
      return;
    }
    setIsUpdating(true);
    const deletions = initialIds.filter((id) => !editedIds.includes(id));
    const additions = editedImages.filter(
      (img) => !initialIds.includes(img.storageId || img.id)
    );

    try {
      // Delete removed images
      // Already handled deletions individually via handleImageDelete (optimistic), skip here.

      // Metadata now saved server-side during upload; no-op here

      // Update order if changed
      if (hasOrderChange) {
        await updateImageOrder({ userId: profileUserId, imageIds: editedIds });
      }

      await queryClient.invalidateQueries({
        queryKey: ["profileImages", profile._id],
      });
      showSuccessToast("Profile photos updated");
      setInitialImages(editedImages);
      router.push("/profile");
    } catch (error) {
      console.error("Failed to save image updates:", error);
      showErrorToast(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setIsUpdating(false);
    }
  }, [
    profile,
    hasChanges,
    hasOrderChange,
    initialIds,
    editedIds,
    editedImages,
    profileUserId,
    queryClient,
    router,
  ]);

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
            images={editedImages}
            onImagesChanged={handleImagesChanged}
            onImageDelete={handleImageDelete}
            onImageReorder={handleImageReorder}
            isLoading={imagesLoading || isUpdating}
            profileId={profileUserId}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isUpdating || !hasChanges}
            >
              {isUpdating
                ? "Saving..."
                : isAutoSaving &&
                    hasOrderChange &&
                    !hasAdditions &&
                    !hasDeletions
                  ? "Auto-saving..."
                  : hasChanges
                    ? "Save"
                    : "No Changes"}
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex flex-col gap-1">
            <span>
              {hasOrderChange ? "Order changed" : "Order unchanged"}
              {hasAdditions ? " • New photos added" : ""}
              {hasDeletions ? " • Photos removed" : ""}
            </span>
            {isAutoSaving &&
              !isUpdating &&
              hasOrderChange &&
              !hasAdditions &&
              !hasDeletions && <span>Saving order…</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
