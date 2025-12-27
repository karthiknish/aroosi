"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { profileAPI } from "@/lib/api/profile";
import { useProfileImages } from "@/hooks/useProfileImages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProfileFormStepImages from "@/components/profile/ProfileFormStepImages";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@aroosi/shared/types";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "@/lib/ui/toast";
import {
  updateImageOrder,
  uploadProfileImageWithProgressCancellable,
  deleteImageById,
  setMainProfileImage,
} from "@/lib/utils/imageUtil";
import { DuplicateSession } from "@/lib/utils/imageUploadHelpers";

export default function EditProfileImagesPage() {
  // Local images not yet persisted to backend
  const [localImages, setLocalImages] = useState<ProfileImageInfo[]>([]);
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
  // Per-image upload state during deferred save
  const [uploadStates, setUploadStates] = useState<
    Record<
      string,
      {
        status:
          | "idle"
          | "pending"
          | "uploading"
          | "success"
          | "error"
          | "canceled";
        progress: number;
        error?: string;
        cancel?: () => void;
      }
    >
  >({});
  const [batchCanceled, setBatchCanceled] = useState(false);

  // Local image state for optimistic edits
  const [editedImages, setEditedImages] = useState<ProfileImageInfo[]>([]);
  const [initialImages, setInitialImages] = useState<ProfileImageInfo[]>([]);

  // Clear duplicate session on mount and when user changes to avoid interference
  useEffect(() => {
    try {
      sessionStorage.removeItem(DuplicateSession.key);
      // Also clear any other related storage
      sessionStorage.removeItem("profile_upload_hashes_v1");
    } catch {
      // Ignore storage errors
    }
  }, [userId]);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["profile", userId],
      queryFn: async () => {
        if (!userId) return null;
        try {
          const data = await profileAPI.getProfileForUser(userId);
          return data as Profile;
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          return null;
        }
      },
      enabled: !!userId,
    }
  );

  const profileUserId = profile?.userId || (profile as any)?._id;
  const { images: rawImages, loading: imagesLoading } = useProfileImages({
    userId: profileUserId,
    enabled: !!profileUserId,
    // Force fetch from backend to ensure we have canonical storageId paths for ordering
    preferInlineUrls: null,
  });

  // Memoize images to prevent infinite re-renders
  const images: ProfileImageInfo[] = useMemo(() => rawImages, [rawImages]);

  // Always sync editedImages and initialImages with backend images, but preserve any local (not yet persisted) images
  useEffect(() => {
    if (imagesLoading) return;
    // Persisted images coming from backend
    const persisted = images;
    setInitialImages(persisted);

    // Preserve locally added images (id starts with 'local-' or contains ':' or lacks storageId)
    const isLocal = (img: ProfileImageInfo) =>
      (img.storageId?.startsWith?.("local-") ?? false) ||
      (typeof img.storageId === "string" && img.storageId.includes(":"));

    setEditedImages((prev) => {
      // Only preserve local images that were already in editedImages
      const currentLocals = (prev || []).filter(isLocal);

      // Merge persisted with existing locals
      const merged: ProfileImageInfo[] = [...persisted, ...currentLocals];

      // Only update if changed
      const joinIds = (arr: ProfileImageInfo[]) =>
        arr.map((i) => i.storageId || i.url).join(",");
      if (joinIds(merged) !== joinIds(prev)) {
        return merged;
      }
      return prev;
    });
  }, [images, imagesLoading]); // Removed localImages to prevent infinite loop
  // Child now always sends full objects including optimistic items.
  const handleImagesChanged = useCallback(
    (updated: ProfileImageInfo[] | string[]) => {
      if (!Array.isArray(updated)) return;
      // If string array (legacy) ignore; we expect objects now
      if (updated.length === 0) {
        setLocalImages([]);
        setEditedImages([]);
        return;
      }
      if (typeof updated[0] === "string") return;
      const updatedImages = updated as ProfileImageInfo[];
      const isLocal = (img: ProfileImageInfo) =>
        (img.storageId?.startsWith?.("local-") ?? false) ||
        (typeof img.storageId === "string" && img.storageId.includes(":"));

      const nextLocal = updatedImages.filter(isLocal);

      // Update local images
      setLocalImages((prev) => {
        const joinIds = (arr: ProfileImageInfo[]) =>
          arr.map((i) => i.storageId).join(",");
        return joinIds(nextLocal) !== joinIds(prev) ? nextLocal : prev;
      });

      // Update edited images to include all images (both persisted and local)
      setEditedImages((prev) => {
        const joinIds = (arr: ProfileImageInfo[]) =>
          arr.map((i) => i.storageId).join(",");
        return joinIds(updatedImages) !== joinIds(prev) ? updatedImages : prev;
      });
    },
    [] // Removed dependencies to prevent infinite loops
  );

  const handleImageDelete = useCallback(
    async (imageId: string) => {
      let target: ProfileImageInfo | undefined;

      // Check if it's a local image
      const isLocal = (img: ProfileImageInfo) =>
        (img.storageId?.startsWith?.("local-") ?? false) ||
        (typeof img.storageId === "string" && img.storageId.includes(":"));

      // Find target in both editedImages and localImages
      setEditedImages((prev) => {
        target = prev.find((i) => i.storageId === imageId);
        return prev.filter((img) => img.storageId !== imageId);
      });

      // Also remove from localImages if it's there
      setLocalImages((prev) => {
        if (!target) {
          target = prev.find((i) => i.storageId === imageId);
        }
        return prev.filter((img) => img.storageId !== imageId);
      });

      // If it's a local image, no need to call API
      if (target && isLocal(target)) {
        showInfoToast("Photo removed");
        return;
      }

      try {
        if (!target) return;
        const storageId = target.storageId;
        await deleteImageById(storageId);
        showInfoToast("Photo deleted");
        // Invalidate caches
        queryClient.invalidateQueries({
          queryKey: ["profileImages", profileUserId],
        });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      } catch (e: any) {
        showErrorToast(e, "Failed to delete photo");
        // Rollback if failure
        if (target) {
          if (isLocal(target)) {
            setLocalImages((prev) => [...prev, target!]);
          } else {
            setEditedImages((prev) => {
              if (prev.some((i) => i.storageId === imageId))
                return prev; // already back
              return [...prev, target!];
            });
          }
        }
      }
    },
    [profileUserId, queryClient, userId]
  );

  const handleImageReorder = useCallback((newOrder: ProfileImageInfo[]) => {
    setEditedImages(newOrder);
  }, []);

  // Utility to compare arrays + derived change flags
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };
  const normalizeIds = (arr: ProfileImageInfo[]) =>
    arr.map((img) => String(img.storageId));
  const initialIds = normalizeIds(initialImages);
  const editedIds = normalizeIds(editedImages);
  // Combine persisted and local images for display, avoiding duplicates
  const combinedForDisplay = useMemo(() => {
    const isLocal = (img: ProfileImageInfo) =>
      (img.storageId?.startsWith?.("local-") ?? false) ||
      (typeof img.storageId === "string" && img.storageId.includes(":"));

    // If editedImages already contains local images, use it directly
    const hasLocalInEdited = editedImages.some(isLocal);
    if (hasLocalInEdited) {
      return editedImages;
    }

    // Otherwise combine persisted (editedImages) with local
    return [...editedImages, ...localImages];
  }, [editedImages, localImages]);
  const hasOrderChange = !arraysEqual(initialIds, editedIds);
  const hasDeletions = initialIds.some((id) => !editedIds.includes(id));
  const hasAdditions = editedIds.some((id) => !initialIds.includes(id));
  const hasChanges = hasOrderChange || hasDeletions || hasAdditions;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges || isUpdating || isAutoSaving) return;
      e.preventDefault();
      e.returnValue = "You have unsaved photo changes.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges, isUpdating, isAutoSaving]);
  useEffect(() => {
    if (!profile) return;
    if (!hasOrderChange) return;
    if (hasAdditions || hasDeletions) return; // require manual save when structural change
    if (isUpdating) return;
    setIsAutoSaving(true);
    const t = setTimeout(async () => {
      try {
        await updateImageOrder({ userId: profileUserId, imageIds: editedIds });
        setInitialImages(() => editedImages.filter((img) => img.storageId));
        queryClient.invalidateQueries({
          queryKey: ["profileImages", profile._id],
        });
        showInfoToast("Order auto-saved");
      } catch (e: any) {
        let msg = e?.message || "Failed to auto-save order";
        if (
          (e instanceof Error && (e as any).code === "INVALID_IMAGE_IDS") ||
          /Invalid image IDs|processing/.test(String(e?.message || ""))
        ) {
          msg =
            "Waiting for photo uploads to finish before saving order. It will auto-save once complete.";
        }
        showErrorToast(msg);
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
    profile,
    profileUserId,
    isUpdating,
    queryClient,
    editedImages,
  ]);

  // Persist all changes
  const handleSaveChanges = useCallback(async () => {
    if (!profile) return;
    if (!hasChanges) {
      showInfoToast("No changes to save");
      return;
    }
    setIsUpdating(true);
    setBatchCanceled(false);
    const _deletions = initialIds.filter((id) => !editedIds.includes(id));
    const _additions = editedImages.filter(
      (img) => !initialIds.includes(img.storageId)
    );

    // Filter out local/temp IDs before sending to updateImageOrder
    const isLocalId = (id: string) =>
      id.startsWith("local-") || id.includes(":");
    // Upload local images in parallel with progress & cancel
    let persistedImages: ProfileImageInfo[] = [...editedImages];
    const localToUpload = editedImages.filter((img) =>
      isLocalId(img.storageId)
    );
    if (localToUpload.length) {
      // Filter out any that already succeeded (user hit Save again after partial success)
      const queue = localToUpload.filter(
        (li) => uploadStates[li.storageId]?.status !== "success"
      );
      if (queue.length) {
        // Initialize upload state entries
        setUploadStates((prev) => {
          const next = { ...prev } as typeof prev;
          for (const li of queue) {
            if (
              !next[li.storageId] ||
              next[li.storageId].status === "idle" ||
              next[li.storageId].status === "error"
            ) {
              next[li.storageId] = { status: "uploading", progress: 0 };
            }
          }
          return next;
        });

        const MAX_CONCURRENT = 3;
        let index = 0;

        const worker = async () => {
          while (true) {
            if (batchCanceled) return;
            const localImg = queue[index++];
            if (!localImg) return;
            try {
              // Get underlying blob from the object URL (or remote URL if ever applicable)
              const resp = await fetch(localImg.url);
              const blob = await resp.blob();
              const file = new File([blob], localImg.fileName || "photo.jpg", {
                type: blob.type || "image/jpeg",
              });
              const { promise, cancel } =
                uploadProfileImageWithProgressCancellable(
                  file,
                  (loaded, total) => {
                    setUploadStates((prev) => ({
                      ...prev,
                      [localImg.storageId]: {
                        ...(prev[localImg.storageId] || { status: "uploading" }),
                        status:
                          prev[localImg.storageId]?.status === "canceled"
                            ? "canceled"
                            : loaded < total
                              ? "uploading"
                              : "success",
                        progress: total
                          ? Math.min(100, Math.round((loaded / total) * 100))
                          : 0,
                        cancel,
                      },
                    }));
                  }
                );
              // Store cancel immediately (in case progress cb hasn't fired yet)
              setUploadStates((prev) => ({
                ...prev,
                [localImg.storageId]: {
                  ...(prev[localImg.storageId] || {
                    status: "uploading",
                    progress: 0,
                  }),
                  cancel,
                },
              }));
              const result = await promise;
              if (result?.imageId) {
                persistedImages = persistedImages.map((p) =>
                  p.storageId === localImg.storageId
                    ? {
                        ...p,
                        storageId: result.imageId,
                        url: result.url || p.url,
                      }
                    : p
                );
                setUploadStates((prev) => ({
                  ...prev,
                  [localImg.storageId]: {
                    ...(prev[localImg.storageId] || {}),
                    status: "success",
                    progress: 100,
                  },
                }));
              }
            } catch (e: any) {
              const aborted = /aborted|canceled/i.test(e?.message || "");
              setUploadStates((prev) => ({
                ...prev,
                [localImg.storageId]: {
                  ...(prev[localImg.storageId] || {}),
                  status: aborted ? "canceled" : "error",
                  error: aborted ? "Canceled" : e?.message || "Upload failed",
                  progress: prev[localImg.storageId]?.progress || 0,
                },
              }));
            }
          }
        };

        const workers = Array.from({
          length: Math.min(MAX_CONCURRENT, queue.length),
        }).map(() => worker());
        await Promise.all(workers);

        if (batchCanceled) {
          showInfoToast("Upload batch canceled");
          setIsUpdating(false);
          return;
        }

        // After uploads, check for errors
        const anyErrors = Object.values(
          (typeof window !== "undefined"
            ? uploadStates
            : {}) as typeof uploadStates
        ).some((s) => s.status === "error");
        if (anyErrors) {
          showErrorToast(
            "Some images failed to upload. Press Retry on failed ones or remove them, then Save again."
          );
          setIsUpdating(false);
          return;
        }
      }
    }

    const validEditedIds = persistedImages
      .map((img) => img.storageId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .filter((id) => !isLocalId(id));

    try {
      // Delete removed images
      // Already handled deletions individually via handleImageDelete (optimistic), skip here.

      // Metadata now saved server-side during upload; no-op here

      // If there was no prior order, set main image using first persisted id
      if (!Array.isArray(initialIds) || initialIds.length === 0) {
        if (validEditedIds[0]) {
          try {
            await setMainProfileImage(validEditedIds[0]);
          } catch (err) {
            // non-fatal, will still try to update order below
          }
        }
      }

      // Update order if changed
      if (hasOrderChange) {
        await updateImageOrder({
          userId: profileUserId,
          imageIds: validEditedIds,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["profileImages", profile._id],
      });
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      const hadErrors = Object.values(uploadStates).some(
        (s) => s.status === "error"
      );
      if (!hadErrors) {
        showSuccessToast("Profile photos updated");
      }
      // Update state with newly persisted images
      setInitialImages(persistedImages.filter((img) => !!img.storageId));
      setEditedImages(persistedImages);
      if (!Object.values(uploadStates).some((s) => s.status === "error")) {
        router.push("/profile");
      }
    } catch (error: any) {
      console.error("Failed to save image updates:", error);
      // Check for invalid image IDs error from backend
      const errMsg = error?.message || "";
      if (
        errMsg.includes("Invalid image IDs") ||
        (error as any)?.code === "INVALID_IMAGE_IDS" ||
        /processing/.test(errMsg)
      ) {
        showErrorToast(
          "Some photos are still uploading. Please wait for uploads to complete before saving."
        );
      } else {
        showErrorToast(
          error instanceof Error ? error.message : "Failed to save changes"
        );
      }
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
    uploadStates,
    batchCanceled,
  ]);

  if (profileLoading || imagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-light">
        <LoadingSpinner size={32} colorClassName="text-primary" />
        <span className="ml-3 text-primary-dark font-semibold">Loading...</span>
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
    <div className="relative flex items-start justify-center min-h-screen bg-base-light p-4 overflow-hidden">
      {/* Decorative primary circle */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 bg-primary/30 rounded-full opacity-30 blur-3xl" />

      <Card className="w-full bg-base-light max-w-3xl z-10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-neutral-dark">
            Edit Profile Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileFormStepImages
            images={combinedForDisplay}
            onImagesChanged={handleImagesChanged}
            onImageDelete={handleImageDelete}
            onImageReorder={handleImageReorder}
            isLoading={imagesLoading || isUpdating}
            profileId={profileUserId}
            renderAction={(img) => {
              // Show status badges for local images (no storageId) or uploading states
              const st = uploadStates[img.storageId];
              const base =
                "text-[10px] rounded px-1.5 py-0.5 font-medium shadow-sm whitespace-nowrap";
              if (img.storageId.startsWith("local-") || img.storageId.includes(":")) {
                if (st?.status === "uploading") {
                  return (
                    <span className={`${base} bg-primary text-base-light`}>
                      {st.progress}%
                    </span>
                  );
                }
                if (st?.status === "error") {
                  return (
                    <button
                      type="button"
                      className={`${base} bg-danger text-base-light hover:bg-danger/90`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadStates((prev) => ({
                          ...prev,
                          [img.storageId]: { status: "idle", progress: 0 },
                        }));
                      }}
                    >
                      Retry
                    </button>
                  );
                }
                if (st?.status === "canceled") {
                  return (
                    <span className={`${base} bg-neutral-light text-neutral-dark`}>
                      Canceled
                    </span>
                  );
                }
                if (st?.status === "success") {
                  return (
                    <span className={`${base} bg-success text-base-light`}>
                      Uploaded
                    </span>
                  );
                }
                return (
                  <span className={`${base} bg-neutral text-base-light`}>
                    Pending
                  </span>
                );
              }
              return null;
            }}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            {isUpdating &&
              Object.values(uploadStates).some(
                (s) => s.status === "uploading"
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBatchCanceled(true);
                    setUploadStates((prev) => {
                      for (const k of Object.keys(prev)) {
                        prev[k].cancel?.();
                      }
                      const next: typeof prev = {} as any;
                      for (const k of Object.keys(prev)) {
                        const st = prev[k];
                        next[k] = {
                          ...st,
                          status:
                            st.status === "uploading" ? "canceled" : st.status,
                        };
                      }
                      return { ...next };
                    });
                  }}
                >
                  Abort Uploads
                </Button>
              )}
            <Button
              onClick={handleSaveChanges}
              disabled={isUpdating}
              aria-disabled={isUpdating}
              title={isUpdating ? "Saving changes..." : "Save your changes."}
            >
              {isUpdating
                ? "Saving..."
                : isAutoSaving &&
                    hasOrderChange &&
                    !hasAdditions &&
                    !hasDeletions
                  ? "Auto-saving..."
                  : "Save"}
            </Button>
          </div>
          <div className="mt-2 text-xs text-neutral/60 flex flex-col gap-1">
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
            {isUpdating && Object.keys(uploadStates).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(uploadStates).map(([id, st]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate max-w-[140px]">
                      {id.replace(/^local-/, "")}
                    </span>
                    <div className="flex items-center gap-2">
                      {st.status === "uploading" && (
                        <div className="w-12 h-1 bg-neutral/20 rounded overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${st.progress}%` }}
                          />
                        </div>
                      )}
                      {st.status === "error" && (
                        <button
                          type="button"
                          className="text-[10px] text-danger underline"
                          onClick={() =>
                            setUploadStates((prev) => ({
                              ...prev,
                              [id]: { status: "idle", progress: 0 },
                            }))
                          }
                        >
                          Retry
                        </button>
                      )}
                      {st.status === "uploading" && st.cancel && (
                        <button
                          type="button"
                          className="text-[10px] text-neutral underline"
                          onClick={() => st.cancel?.()}
                        >
                          Cancel
                        </button>
                      )}
                      {st.status === "canceled" && (
                        <span className="text-[10px] text-neutral/50">
                          Canceled
                        </span>
                      )}
                      {st.status === "success" && (
                        <span className="text-[10px] text-success">
                          Done
                        </span>
                      )}
                      {st.status === "error" && (
                        <span className="text-[10px] text-danger">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
