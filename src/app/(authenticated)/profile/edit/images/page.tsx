"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
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
import {
  updateImageOrder,
  uploadProfileImageWithProgressCancellable,
  deleteImageById,
} from "@/lib/utils/imageUtil";
import { DuplicateSession } from "@/lib/utils/imageUploadHelpers";

export default function EditProfileImagesPage() {
  // Local images not yet persisted to backend
  const [localImages, setLocalImages] = useState<ImageType[]>([]);
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
  const [editedImages, setEditedImages] = useState<ImageType[]>([]);
  const [initialImages, setInitialImages] = useState<ImageType[]>([]);

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
    // Force fetch from backend to ensure we have canonical storageId paths for ordering
    preferInlineUrls: null,
  });

  // Memoize images to prevent infinite re-renders
  const images: ImageType[] = useMemo(
    () =>
      rawImages.map((img) => ({
        id: img.storageId || img.url,
        url: img.url,
        storageId: img.storageId,
      })) as ImageType[],
    [rawImages]
  );

  // Always sync editedImages and initialImages with backend images, but preserve any local (not yet persisted) images
  useEffect(() => {
    if (imagesLoading) return;
    // Persisted images coming from backend
    const persisted = images;
    setInitialImages(persisted);

    // Preserve locally added images (id starts with 'local-' or contains ':' or lacks storageId)
    const isLocal = (img: ImageType) =>
      (img.id?.startsWith?.("local-") ?? false) ||
      (typeof img.id === "string" && img.id.includes(":")) ||
      !img.storageId;

    setEditedImages((prev) => {
      // Only preserve local images that were already in editedImages
      const currentLocals = (prev || []).filter(isLocal);

      // Merge persisted with existing locals
      const merged: ImageType[] = [...persisted, ...currentLocals];

      // Only update if changed
      const joinIds = (arr: ImageType[]) =>
        arr.map((i) => i.id || i.url).join(",");
      if (joinIds(merged) !== joinIds(prev)) {
        return merged;
      }
      return prev;
    });
  }, [images, imagesLoading]); // Removed localImages to prevent infinite loop
  // Child now always sends full ImageType[] including optimistic items.
  const handleImagesChanged = useCallback(
    (updated: ImageType[] | string[]) => {
      if (!Array.isArray(updated)) return;
      // If string array (legacy) ignore; we expect objects now
      if (updated.length === 0) {
        setLocalImages([]);
        setEditedImages([]);
        return;
      }
      if (typeof updated[0] === "string") return;
      const updatedImages = updated as ImageType[];
      const isLocal = (img: ImageType) =>
        (img.id?.startsWith?.("local-") ?? false) ||
        (typeof img.id === "string" && img.id.includes(":")) ||
        !img.storageId;

      const nextLocal = updatedImages.filter(isLocal);

      // Update local images
      setLocalImages((prev) => {
        const joinIds = (arr: ImageType[]) => arr.map((i) => i.id).join(",");
        return joinIds(nextLocal) !== joinIds(prev) ? nextLocal : prev;
      });

      // Update edited images to include all images (both persisted and local)
      setEditedImages((prev) => {
        const joinIds = (arr: ImageType[]) => arr.map((i) => i.id).join(",");
        return joinIds(updatedImages) !== joinIds(prev) ? updatedImages : prev;
      });
    },
    [] // Removed dependencies to prevent infinite loops
  );

  const handleImageDelete = useCallback(
    async (imageId: string) => {
      let target: ImageType | undefined;

      // Check if it's a local image
      const isLocal = (img: ImageType) =>
        (img.id?.startsWith?.("local-") ?? false) ||
        (typeof img.id === "string" && img.id.includes(":")) ||
        !img.storageId;

      // Find target in both editedImages and localImages
      setEditedImages((prev) => {
        target = prev.find((i) => (i.storageId || i.id) === imageId);
        return prev.filter((img) => (img.storageId || img.id) !== imageId);
      });

      // Also remove from localImages if it's there
      setLocalImages((prev) => {
        if (!target) {
          target = prev.find((i) => (i.storageId || i.id) === imageId);
        }
        return prev.filter((img) => (img.storageId || img.id) !== imageId);
      });

      // If it's a local image, no need to call API
      if (target && isLocal(target)) {
        showInfoToast("Photo removed");
        return;
      }

      try {
        if (!target) return;
        const storageId = target.storageId || target.id;
        await deleteImageById(storageId);
        showInfoToast("Photo deleted");
        // Invalidate caches
        queryClient.invalidateQueries({
          queryKey: ["profileImages", profileUserId],
        });
        queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      } catch (e: any) {
        showErrorToast(e?.message || "Failed to delete photo");
        // Rollback if failure
        if (target) {
          if (isLocal(target)) {
            setLocalImages((prev) => [...prev, target!]);
          } else {
            setEditedImages((prev) => {
              if (prev.some((i) => (i.storageId || i.id) === imageId))
                return prev; // already back
              return [...prev, target!];
            });
          }
        }
      }
    },
    [profileUserId, queryClient, userId]
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
    arr.map((img) => (img.storageId ? String(img.storageId) : String(img.id)));
  const initialIds = normalizeIds(initialImages);
  const editedIds = normalizeIds(editedImages);
  // Combine persisted and local images for display, avoiding duplicates
  const combinedForDisplay = useMemo(() => {
    const isLocal = (img: ImageType) =>
      (img.id?.startsWith?.("local-") ?? false) ||
      (typeof img.id === "string" && img.id.includes(":")) ||
      !img.storageId;

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
      (img) => !initialIds.includes(img.storageId || img.id)
    );

    // Filter out local/temp IDs before sending to updateImageOrder
    const isLocalId = (id: string) =>
      id.startsWith("local-") || id.includes(":");
    // Upload local images in parallel with progress & cancel
    let persistedImages: ImageType[] = [...editedImages];
    const localToUpload = editedImages.filter((img) => isLocalId(img.id));
    if (localToUpload.length) {
      // Filter out any that already succeeded (user hit Save again after partial success)
      const queue = localToUpload.filter(
        (li) => uploadStates[li.id]?.status !== "success"
      );
      if (queue.length) {
        // Initialize upload state entries
        setUploadStates((prev) => {
          const next = { ...prev } as typeof prev;
          for (const li of queue) {
            if (
              !next[li.id] ||
              next[li.id].status === "idle" ||
              next[li.id].status === "error"
            ) {
              next[li.id] = { status: "uploading", progress: 0 };
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
                      [localImg.id]: {
                        ...(prev[localImg.id] || { status: "uploading" }),
                        status:
                          prev[localImg.id]?.status === "canceled"
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
                [localImg.id]: {
                  ...(prev[localImg.id] || {
                    status: "uploading",
                    progress: 0,
                  }),
                  cancel,
                },
              }));
              const result = await promise;
              if (result?.imageId) {
                persistedImages = persistedImages.map((p) =>
                  p.id === localImg.id
                    ? {
                        ...p,
                        id: result.imageId,
                        storageId: result.imageId,
                        url: result.url || p.url,
                      }
                    : p
                );
                setUploadStates((prev) => ({
                  ...prev,
                  [localImg.id]: {
                    ...(prev[localImg.id] || {}),
                    status: "success",
                    progress: 100,
                  },
                }));
              }
            } catch (e: any) {
              const aborted = /aborted|canceled/i.test(e?.message || "");
              setUploadStates((prev) => ({
                ...prev,
                [localImg.id]: {
                  ...(prev[localImg.id] || {}),
                  status: aborted ? "canceled" : "error",
                  error: aborted ? "Canceled" : e?.message || "Upload failed",
                  progress: prev[localImg.id]?.progress || 0,
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
      .map((img) => img.storageId || img.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .filter((id) => !isLocalId(id));

    try {
      // Delete removed images
      // Already handled deletions individually via handleImageDelete (optimistic), skip here.

      // Metadata now saved server-side during upload; no-op here

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
        (error?.response &&
          error?.response?.error?.includes("Invalid image IDs"))
      ) {
        showErrorToast(
          "Some images haven't finished uploading yet. Please wait for uploads to complete before saving the order."
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

      <Card className="w-full bg-white max-w-3xl z-10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-neutral">
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
              const st = uploadStates[img.id];
              const base =
                "text-[10px] rounded px-1.5 py-0.5 font-medium shadow-sm whitespace-nowrap";
              if (!img.storageId) {
                if (st?.status === "uploading") {
                  return (
                    <span className={`${base} bg-pink-600 text-white`}>
                      {st.progress}%
                    </span>
                  );
                }
                if (st?.status === "error") {
                  return (
                    <button
                      type="button"
                      className={`${base} bg-red-600 text-white hover:bg-red-700`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadStates((prev) => ({
                          ...prev,
                          [img.id]: { status: "idle", progress: 0 },
                        }));
                      }}
                    >
                      Retry
                    </button>
                  );
                }
                if (st?.status === "canceled") {
                  return (
                    <span className={`${base} bg-gray-400 text-white`}>
                      Canceled
                    </span>
                  );
                }
                if (st?.status === "success") {
                  return (
                    <span className={`${base} bg-emerald-600 text-white`}>
                      Uploaded
                    </span>
                  );
                }
                return (
                  <span className={`${base} bg-neutral text-white`}>
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
                            className="h-full bg-pink-600 transition-all"
                            style={{ width: `${st.progress}%` }}
                          />
                        </div>
                      )}
                      {st.status === "error" && (
                        <button
                          type="button"
                          className="text-[10px] text-red-600 underline"
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
                        <span className="text-[10px] text-emerald-600">
                          Done
                        </span>
                      )}
                      {st.status === "error" && (
                        <span className="text-[10px] text-red-600">Failed</span>
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
