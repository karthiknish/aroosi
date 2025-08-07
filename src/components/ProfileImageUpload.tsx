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
import { Id } from "@convex/_generated/dataModel";
import { useAuthContext } from "./AuthProvider";
import type { ImageType } from "@/types/image";
import {
  fetchAdminProfileImagesById,
  deleteAdminProfileImageById,
  adminUploadProfileImage,
} from "@/lib/profile/adminProfileApi";
import {
  fetchUserProfileImages,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";

// Types
type UploadImageResponse = {
  success: boolean;
  imageId: Id<"_storage">;
  message: string;
};

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
  onImagesChanged?: (newImageIds: string[] | ImageType[]) => void;
  adminUpdateProfile?: (args: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => Promise<unknown>;
  mode?: "create" | "edit";
  uploadImageFn?: (args: {
    userId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{ success: boolean; imageId: Id<"_storage">; message: string }>;
};

// Combine the props, making all userId-dependent props optional
type ProfileImageUploadProps = ProfileImageUploadBaseProps &
  Partial<ProfileImageUploadWithUserId>;

export function ProfileImageUpload({
  userId,
  onImagesChanged,
  onFileSelect,
  mode = "edit",
  className = "",
  profileId,
  isAdmin,
}: ProfileImageUploadProps) {
  // Hooks must be called unconditionally at the top level
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { refreshProfile, isAdmin: authIsAdmin } = useAuthContext();

  // State management (moved to top)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const lastNotifiedImageIds = useRef<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const prevImageCount = useRef<number>(0);
  const [localImages, setLocalImages] = useState<ImageType[]>([]);
  const [optimisticImages, setOptimisticImages] = useState<ImageType[]>([]);
  const MAX_IMAGES_PER_USER = 5;

  const { data: orderedImages = [], refetch: _refetchImages } = useQuery({
    queryKey: ["profileImages", userId, authIsAdmin, profileId],
    queryFn: async () => {
      try {
        if (!userId || userId === "user-id-placeholder") {
          console.warn("Missing or placeholder userId when fetching images");
          return [];
        }

        if (authIsAdmin && profileId) {
          // Use admin util for fetching images (cookie-auth)
          try {
            // TODO: migrate admin API to cookie-auth; until then pass empty token
            return await fetchAdminProfileImagesById({ token: "", profileId });
          } catch (error) {
            console.error("Error fetching admin profile images:", error);
            showErrorToast(null, "Failed to load profile images");
            return [];
          }
        }

        // Use existing utility function (cookie-auth)
        const result = await fetchUserProfileImages(userId);
        if (!result.success) {
          console.error("Error fetching user profile images:", result.error);
          if (result.error?.includes("Authentication")) {
            showErrorToast(null, "Please sign in again to view images");
          } else {
            showErrorToast(null, "Failed to load profile images");
          }
          return [];
        }

        if (!result.data) return [];

        return (result.data || [])
          .filter((img) => !!img?.url && !!img?.storageId)
          .map((img) => ({
            ...img,
            id: img.storageId,
            storageId: img.storageId,
          })) as ImageType[];
      } catch (error) {
        console.error("Unexpected error fetching profile images:", error);
        showErrorToast(
          null,
          "An unexpected error occurred while loading images"
        );
        return [];
      }
    },
    enabled: mode === "edit" && !!userId && userId !== "user-id-placeholder",
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes("Authentication")) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  // Initialize hasInitialized after first query or in create mode
  React.useEffect(() => {
    if (
      !hasInitialized &&
      (mode === "create" || (mode === "edit" && orderedImages))
    ) {
      setHasInitialized(true);
    }
  }, [mode, orderedImages, hasInitialized]);

  // Wrap refetchImages to include reordering logic
  const refetchImages = useCallback(async () => {
    try {
      await _refetchImages();
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
  }, [_refetchImages, refreshProfile, queryClient, userId]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserWithProfile"],
    queryFn: async () => {
      const result = await getCurrentUserWithProfile();
      if (!result.success) return null;
      return result.data;
    },
  });

  // Memoize the ordered images with proper typing first
  const memoizedOrderedImages = useMemo(() => {
    if (mode === "create") {
      return [...localImages, ...optimisticImages];
    }
    const validImages = (orderedImages || []).filter((img): img is ImageType =>
      Boolean(img?.url && img.id)
    );
    // Combine server images with optimistic updates
    return [...validImages, ...optimisticImages];
  }, [mode, localImages, orderedImages, optimisticImages]);

  // Memoize the profile image IDs
  const profileImageIds = useMemo(() => {
    return memoizedOrderedImages.map((img) => img.id);
  }, [memoizedOrderedImages]);

  useEffect(() => {
    // Only call onImagesChanged after initial load, not on mount
    if (onImagesChanged && hasInitialized) {
      const imageIdsString = profileImageIds.join(",");

      // Only notify if the image IDs actually changed
      if (imageIdsString !== lastNotifiedImageIds.current) {
        lastNotifiedImageIds.current = imageIdsString;

        if (mode === "create") {
          // In create mode, notify parent with the full image objects
          onImagesChanged(memoizedOrderedImages);
        } else {
          // In edit mode, notify with image IDs
          onImagesChanged(profileImageIds);
        }
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
    if (mode === "edit" && orderedImages.length > 0) {
      // Clear optimistic images that are now in server data
      setOptimisticImages((prev) =>
        prev.filter(
          (optimistic) =>
            !orderedImages.some((server) => server.id === optimistic.id)
        )
      );
    }
  }, [mode, orderedImages]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.isProfileComplete) {
      router.replace("/"); // Redirect to homepage instead of create-profile
    }
  }, [currentUserProfile, router]);

  const handleStartUpload = () => setIsUploadingFile(true);

  const generateUploadUrl = useCallback(async () => "", []);

  // Move uploadImage definition above uploadImageToUse
  const uploadImage = useCallback(
    async (args: {
      userId: string;
      storageId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    }): Promise<UploadImageResponse> => {
      if (mode === "create") {
        // In create mode, create a local image object with a temporary ID
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newImage: ImageType = {
          id: tempId,
          url: URL.createObjectURL(new Blob()), // Will be replaced with actual file preview
          storageId: tempId,
          fileName: args.fileName,
        };
        setLocalImages((prev) => [...prev, newImage]);

        // Return success for create mode
        return {
          success: true,
          imageId: tempId as Id<"_storage">,
          message: "Image added locally",
        };
      }

      return {
        success: true,
        imageId: args.storageId as Id<"_storage">,
        message: "Image uploaded",
      };
    },
    [mode]
  );

  // For admin, override uploadImageFile in ImageUploader to use adminUploadProfileImage
  const uploadImageFileAdmin = async (file: File) => {
    if (!profileId)
      throw new Error("Profile ID not available for admin upload.");
    // TODO: migrate adminUploadProfileImage to cookie-auth; until then pass empty token
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
        await deleteAdminProfileImageById({ token: "", profileId, imageId });
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
  const handleOptimisticUpload = useCallback((newImage: ImageType) => {
    setOptimisticImages((prev) => [...prev, newImage]);
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
    [mode],
  );

  const handleOptimisticReorder = useCallback(
    (newOrder: ImageType[]) => {
      // Clear optimistic images since the new order includes everything
      setOptimisticImages([]);
      if (mode === "create") {
        setLocalImages(newOrder);
      }
    },
    [mode],
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
        <label className="flex flex-col items-center justify-center w-full h-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
          <svg
            className="w-8 h-8 mb-2 text-gray-500"
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
          <p className="text-sm text-gray-500 text-center">
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
      {/* Display existing images with drag-and-drop reorder & delete */}
      {memoizedOrderedImages.length > 0 && (
        <ProfileImageReorder
          images={memoizedOrderedImages}
          userId={userId}
          onReorder={handleOptimisticReorder}
          onDeleteImage={(id) => deleteImageMutation.mutate(id)}
          onOptimisticDelete={handleOptimisticDelete}
        />
      )}

      {/* Image Upload Section (Use ImageUploader for adding new images) */}
      {(memoizedOrderedImages?.length ?? 0) < MAX_IMAGES_PER_USER && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Add New Photo</h3>
            <span className="text-xs text-muted-foreground">
              {memoizedOrderedImages?.length ?? 0} of {MAX_IMAGES_PER_USER}{" "}
              photos
            </span>
          </div>
          <ImageUploader
            userId={userId}
            orderedImages={memoizedOrderedImages}
            generateUploadUrl={isAdminMode ? async () => "" : generateUploadUrl}
            uploadImage={
              isAdminMode
                ? async () => ({
                    success: true,
                    imageId: "dummy" as Id<"_storage">,
                    message: "noop",
                  })
                : uploadImage
            }
            setIsUploading={setIsUploading}
            isUploading={isUploading}
            fetchImages={refetchImages}
            onStartUpload={handleStartUpload}
            onOptimisticUpdate={handleOptimisticUpload}
            className="w-full"
            {...(isAdminMode ? { customUploadFile: uploadImageFileAdmin } : {})}
          />
          {/* Upload limit indicator */}
          <div className="flex justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length || 0) === 0
                ? "Maximum photos uploaded"
                : `Upload up to ${MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length || 0)} more`}
            </p>
            <p className="text-xs text-muted-foreground">
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
