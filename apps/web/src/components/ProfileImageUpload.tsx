import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
// Local-only upload now handled inside ImageUploader; old helpers removed
import { ImageUploader } from "./ImageUploader";
import ImageDeleteConfirmation from "./ImageDeleteConfirmation";
import { ProfileImageReorder } from "./ProfileImageReorder";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import {
  deleteAdminProfileImageById,
  adminUploadProfileImage,
} from "@/lib/profile/adminProfileApi";
import { useAdminProfileImages } from "@/hooks/useAdminProfileImages";
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";
import { useProfileImages } from "@/hooks/useProfileImages";
import { normalizeProfileImages } from "@/lib/images/profileImageUtils";
import type { NormalizedProfileImage } from "@/lib/images/profileImageUtils";

// Types
// Note: Upload responses are handled internally by ImageUploader and utilities

// Base props that are always available
type ProfileImageUploadBaseProps = {
  className?: string;
  onFileSelect?: (file: File) => void | Promise<void>;
};

// Props that are only required when userId is provided
type ProfileImageUploadWithUserId = {
  userId: string;
  isAdmin?: boolean;
  profileId?: string;
  onImagesChanged?: (newImageIds: string[] | ProfileImageInfo[]) => void;
  adminUpdateProfile?: (args: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => Promise<unknown>;
  mode?: "create" | "edit";
  /** Controls how the internal ImageUploader behaves: local (deferred) or immediate */
  uploaderMode?: "local" | "immediate";
  uploadImageFn?: (args: {
    userId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{ success: boolean; imageId: string; message: string }>;
};

// Combine the props, making all userId-dependent props optional
type ProfileImageUploadProps = ProfileImageUploadBaseProps &
  Partial<ProfileImageUploadWithUserId>;

export function ProfileImageUpload({
  userId,
  onImagesChanged,
  onFileSelect,
  mode = "edit",
  uploaderMode = "immediate",
  className = "",
  profileId,
  isAdmin,
}: ProfileImageUploadProps) {
  // Hooks must be called unconditionally at the top level
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { refreshProfile, isAdmin: authIsAdmin, user } = useAuthContext();
  const derivedUserId = user?.uid || userId;

  // State management (moved to top)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const lastNotifiedImageIds = useRef<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const prevImageCount = useRef<number>(0);
  const [localImages, setLocalImages] = useState<NormalizedProfileImage[]>([]);
  const [optimisticImages, setOptimisticImages] = useState<NormalizedProfileImage[]>([]);
  const MAX_IMAGES_PER_USER = 5;

  const { images: adminImages, query: adminImagesQuery } =
    useAdminProfileImages({ profileId, enabled: authIsAdmin && !!profileId });

  // Non-admin images via shared hook
  const { images: userImages } = useProfileImages({
    userId: derivedUserId,
    enabled: mode === "edit" && !!derivedUserId && !authIsAdmin,
  });

  // Initialize hasInitialized after first query or in create mode
  React.useEffect(() => {
    if (
      !hasInitialized &&
      (mode === "create" ||
        (mode === "edit" && (authIsAdmin ? adminImages : userImages)))
    ) {
      setHasInitialized(true);
    }
  }, [mode, adminImages, userImages, authIsAdmin, hasInitialized]);

  // Wrap refetchImages to include reordering logic
  const refetchImages = useCallback(async () => {
    try {
      if (authIsAdmin) {
        await adminImagesQuery.refetch();
      }
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: ["profile-images", userId],
        });
      }
      await refreshProfile();
    } catch (error) {
      console.error("Failed to refetch images:", error);
      showErrorToast(null, "Failed to refresh images");
    }
  }, [adminImagesQuery, refreshProfile, queryClient, userId, authIsAdmin]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserWithProfile"],
    queryFn: async () => {
      const result = await getCurrentUserWithProfile(
        derivedUserId || userId || ""
      );
      if (!result.success) return null;
      return result.data;
    },
  });

  // Memoize the ordered images with proper typing first
  const memoizedOrderedImages = useMemo(() => {
    // Base set depending on mode and admin/user context
    let base: Array<string | { _id: string; url?: string; storageId?: string }> = [];
    if (mode === "create") {
      base = [...localImages];
    } else if (authIsAdmin) {
      base = (adminImages || []).map((i) => ({
        _id: i.storageId,
        storageId: i.storageId,
        url: i.url,
      }));
    } else {
      base = userImages.map((i) => ({
        _id: i.storageId,
        storageId: i.storageId,
        url: i.url,
      }));
    }
    // Normalize to ensure consistent url/id/storageId shapes
    const normalized = normalizeProfileImages({
      rawImages: base as any[],
      profileImageUrls: undefined,
      profileImageIds: undefined,
    });
    // Append optimistic images (already in normalized shape)
    const optimistic = optimisticImages.map((o) => ({
      id: o.id,
      _id: o.id,
      url: o.url,
      storageId: (o as any).storageId || o.id,
    }));
    return [...normalized, ...optimistic];
  }, [
    mode,
    localImages,
    adminImages,
    userImages,
    optimisticImages,
    authIsAdmin,
  ]);

  // Memoize the profile image IDs
  const profileImageIds = useMemo(() => {
    return memoizedOrderedImages.map((img) => img.storageId);
  }, [memoizedOrderedImages]);

  useEffect(() => {
    // Only call onImagesChanged after initial load, not on mount
    if (onImagesChanged && hasInitialized) {
      const imageIdsString = profileImageIds.join(",");

      // Only notify if the image IDs actually changed
      if (imageIdsString !== lastNotifiedImageIds.current) {
        lastNotifiedImageIds.current = imageIdsString;
        // Always send full image objects so parent can distinguish local vs persisted
        onImagesChanged(memoizedOrderedImages);
      }

      // Show success toast only if uploading and image count increased
      if (
        isUploadingFile &&
        memoizedOrderedImages.length > prevImageCount.current
      ) {
        showSuccessToast("Image uploaded successfully");
        // Explicitly refetch images so parent components get latest list immediately
        if (mode === "edit") {
          refetchImages().catch((err) => {
            console.error("Failed to refetch images after upload", err);
          });
        }
        setIsUploadingFile(false);
      }
      prevImageCount.current = memoizedOrderedImages.length;
    }
  }, [
    profileImageIds,
    onImagesChanged,
    hasInitialized,
    isUploadingFile,
    mode,
    memoizedOrderedImages,
    refetchImages,
  ]);

  // Clear optimistic images when server data is updated
  useEffect(() => {
    if (
      mode === "edit" &&
      (authIsAdmin ? adminImages.length : userImages.length) > 0
    ) {
      // Clear optimistic images that are now in server data
      setOptimisticImages((prev) =>
        prev.filter(
          (optimistic) =>
            !(authIsAdmin ? adminImages : userImages).some(
              (server: any) => server.id === optimistic.id
            )
        )
      );
    }
  }, [mode, adminImages, userImages, authIsAdmin]);

  // ...existing code...

  const handleStartUpload = () => setIsUploadingFile(true);

  // Legacy shims removed; ImageUploader uses uploadProfileImage internally now

  // Move uploadImage definition above uploadImageToUse
  // Legacy uploadImage shim removed; uploader handles upload and optimistic state

  // For admin, override uploadImageFile in ImageUploader to use adminUploadProfileImage
  const uploadImageFileAdmin = async (file: File) => {
    if (!profileId)
      throw new Error("Profile ID not available for admin upload.");
    await adminUploadProfileImage({ profileId, file });
    showSuccessToast("Image uploaded successfully");
    await refetchImages();
  };

  // For admin, pass a dummy uploadImage (never called), and override uploadImageFile
  const isAdminRoute = pathname?.startsWith("/admin");
  const isAdminMode = isAdmin && profileId && isAdminRoute;

  // --- REWRITE: deleteImageMutation to fetch new images and send them to reorder after delete ---

  const deleteImageMutation = useMutation<string, Error, string>({
    mutationFn: async (imageId: string) => {
      if (mode === "create") {
        // In create mode, just remove from local state
        setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
        return imageId;
      }

      if (!userId) throw new Error("Missing userId");
      if (authIsAdmin && profileId) {
        // Use admin util for deleting images (cookie-auth)
        await deleteAdminProfileImageById({ profileId, imageId });
        return imageId;
      }
      // Default user delete path currently lacks a client util; perform optimistic removal only.
      // Optionally, implement a DELETE /api/profile-images/:id route and call it here.
      return imageId;
    },
    onSuccess: async () => {
      // After delete, fetch the new images and send them to reorder
      try {
        if (mode === "edit") {
          await refetchImages();
        }
        showSuccessToast("Image deleted successfully");
      } catch {
        showErrorToast(null, "Failed to update image order after delete");
      }
      setIsUploading(false);
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    },
    onError: () => {
      showErrorToast(null, "Failed to delete image");
      setIsUploading(false);
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    },
  });

  // Optimistic update handlers
  const handleOptimisticUpload = useCallback((newImage: ProfileImageInfo) => {
    setOptimisticImages((prev) => [
      ...prev,
      {
        id: newImage.storageId,
        _id: newImage.storageId,
        url: newImage.url,
        storageId: newImage.storageId,
      } as NormalizedProfileImage,
    ]);
  }, []);

  const handleOptimisticDelete = useCallback(
    (imageId: string) => {
      // Remove from optimistic images first
      setOptimisticImages((prev) => prev.filter((img) => img.id !== imageId));
      // Also remove from local images if in create mode
      if (mode === "create") {
        setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    },
    [mode]
  );

  const handleOptimisticReorder = useCallback(
    (newOrder: ProfileImageInfo[]) => {
      // Clear optimistic images since the new order includes everything
      setOptimisticImages([]);
      if (mode === "create") {
        setLocalImages(newOrder as NormalizedProfileImage[]);
      }
    },
    [mode]
  );

  // Handle image deletion
  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    setIsUploading(true);
    deleteImageMutation.mutate(pendingDeleteId);
  }, [pendingDeleteId, deleteImageMutation]);

  // If onFileSelect is provided, use a simplified version of the component
  if (onFileSelect) {
    return (
      <div
        className={`relative flex items-center justify-center ${className || ""}`}
      >
        <label className="flex flex-col items-center justify-center w-full h-full p-4 border-2 border-dashed border-neutral/20 rounded-lg cursor-pointer hover:bg-neutral/5">
          <svg
            className="w-8 h-8 mb-2 text-neutral-light"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-neutral-light text-center">
            Click to upload or drag and drop
          </p>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onFileSelect(file);
              }
              // Reset the input to allow selecting the same file again
              e.target.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  // Original component logic for backward compatibility
  if (!userId) {
    return null;
  }
  return (
    <div className="space-y-4">
      {/* Display existing images with drag-and-drop reorder & delete - DISABLED */}
      {false && memoizedOrderedImages.length > 0 && (
        <ProfileImageReorder
          images={memoizedOrderedImages}
          userId={userId || ""}
          onReorder={handleOptimisticReorder}
          onDeleteImage={(id) => deleteImageMutation.mutate(id)}
          onOptimisticDelete={handleOptimisticDelete}
        />
      )}

      {/* Image Upload Section (Use ImageUploader for adding new images) */}
      {(memoizedOrderedImages?.length ?? 0) < MAX_IMAGES_PER_USER && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-dark">Add New Photo</h3>
            <span className="text-xs text-neutral-light">
              {memoizedOrderedImages?.length ?? 0} of {MAX_IMAGES_PER_USER}{" "}
              photos
            </span>
          </div>
          {memoizedOrderedImages.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral/20 p-3 text-xs text-neutral-light">
              <p className="font-medium text-neutral-dark mb-1">
                Tips for great profile photos
              </p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Use a clear, well-lit photo of just you.</li>
                <li>Avoid heavy filters or group shots.</li>
                <li>Square (1:1) crops look best in listings.</li>
                <li>
                  Minimum size 512×512px. Larger images are automatically
                  optimized.
                </li>
              </ul>
            </div>
          )}
          <ImageUploader
            userId={userId || ""}
            orderedImages={memoizedOrderedImages}
            setIsUploading={setIsUploading}
            isUploading={isUploading}
            fetchImages={refetchImages}
            onStartUpload={handleStartUpload}
            onOptimisticUpdate={handleOptimisticUpload}
            className="w-full"
            mode={uploaderMode}
            {...(isAdminMode ? { customUploadFile: uploadImageFileAdmin } : {})}
          />
          {/* Upload limit indicator */}
          <div className="flex justify-between px-1">
            <p className="text-xs text-neutral-light">
              {MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length || 0) === 0
                ? "Maximum photos uploaded"
                : `Upload up to ${MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length || 0)} more`}
            </p>
            <p className="text-xs text-neutral-light">
              {MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length || 0)}{" "}
              remaining
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ImageDeleteConfirmation
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isUploading}
      />
    </div>
  );
}
