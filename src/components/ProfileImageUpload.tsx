import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { ImageUploader } from "./ImageUploader";
import ImageDeleteConfirmation from "./ImageDeleteConfirmation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { Id } from "@/../convex/_generated/dataModel";
import { useAuthContext } from "./AuthProvider";
import type { ImageType } from "@/types/image";
import {
  fetchAdminProfileImagesById,
  deleteAdminProfileImageById,
  adminUploadProfileImage,
} from "@/lib/profile/adminProfileApi";

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
  onImagesChanged?: (newImageIds: string[]) => void;
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
  const { token, refreshProfile, isAdmin: authIsAdmin } = useAuthContext();

  // State management (moved to top)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [hasInitialized] = useState(false);
  const lastNotifiedImageIds = useRef<string>("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const prevImageCount = useRef<number>(0);
  const MAX_IMAGES_PER_USER = 5;

  const { data: orderedImages = [], refetch: _refetchImages } = useQuery({
    queryKey: ["profileImages", userId, token, authIsAdmin, profileId],
    queryFn: async () => {
      if (!token || !userId || userId === "user-id-placeholder") {
        console.warn(
          "Missing or placeholder token/userId when fetching images"
        );
        return [];
      }
      if (authIsAdmin && profileId) {
        // Use admin util for fetching images
        return await fetchAdminProfileImagesById({ token, profileId });
      }
      // Default user fetch
      const res = await fetch(`/api/profile-detail/${userId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.userProfileImages || []).filter(
        (img: ImageType) => !!img?.url && !!img?.id
      ) as ImageType[];
    },
    enabled:
      mode === "edit" &&
      !!token &&
      !!userId &&
      userId !== "user-id-placeholder",
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });

  // Wrap refetchImages to include reordering logic
  const refetchImages = useCallback(async () => {
    try {
      await _refetchImages();
      // Also refresh the profile to ensure consistency
      await refreshProfile();
    } catch (error) {
      console.error("Failed to refetch images:", error);
      showErrorToast(null, "Failed to refresh images");
    }
  }, [_refetchImages, refreshProfile]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserWithProfile"],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!token,
  });

  // Memoize the profile image IDs
  const profileImageIds = useMemo(() => {
    return (orderedImages || [])
      .filter((img): img is ImageType => Boolean(img?.id))
      .map((img) => img.id);
  }, [orderedImages]);

  useEffect(() => {
    // Only call onImagesChanged after initial load, not on mount
    if (onImagesChanged && hasInitialized) {
      const imageIdsString = profileImageIds.join(",");
      // Only notify if the image IDs actually changed
      if (imageIdsString !== lastNotifiedImageIds.current) {
        lastNotifiedImageIds.current = imageIdsString;
        onImagesChanged(profileImageIds);
        // Show success toast only if uploading and image count increased
        if (
          isUploadingFile &&
          profileImageIds.length > prevImageCount.current
        ) {
          showSuccessToast("Image uploaded successfully");
          setIsUploadingFile(false);
        }
        prevImageCount.current = profileImageIds.length;
      }
    }
  }, [profileImageIds, onImagesChanged, hasInitialized, isUploadingFile]);

  // Memoize the ordered images with proper typing
  const memoizedOrderedImages = useMemo(() => {
    const validImages = (orderedImages || []).filter((img): img is ImageType =>
      Boolean(img?.url && img.id)
    );

    if (!profileImageIds?.length) return validImages;

    const imageMap = new Map(validImages.map((img) => [img.id, img]));

    return profileImageIds
      .map((id) => imageMap.get(id))
      .filter((img): img is ImageType => Boolean(img));
  }, [orderedImages, profileImageIds]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.isProfileComplete) {
      router.replace("/"); // Redirect to homepage instead of create-profile
    }
  }, [currentUserProfile, router]);

  const handleStartUpload = () => setIsUploadingFile(true);

  const generateUploadUrl = useCallback(async () => {
    const res = await fetch("/api/images/upload-url", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to get upload URL");
    }
    const data = await res.json();
    if (!data.uploadUrl) {
      throw new Error("Upload URL not received");
    }
    return data.uploadUrl as string;
  }, [token]);

  // Move uploadImage definition above uploadImageToUse
  const uploadImage = useCallback(
    async (args: {
      userId: string;
      storageId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    }): Promise<UploadImageResponse> => {
      if (!token) {
        throw new Error("Authentication token not available.");
      }

      const res = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(args),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save image via API");
      }

      const data = await res.json();

      // Validate response structure
      if (
        typeof data.success !== "boolean" ||
        typeof data.imageId !== "string" ||
        typeof data.message !== "string"
      ) {
        throw new Error("Invalid response structure from /api/images");
      }

      // Return the response without triggering a refetch
      // The ImageUploader component will handle the success state
      return {
        success: data.success,
        imageId: data.imageId as Id<"_storage">,
        message: data.message,
      };
    },
    [token]
  );

  // For admin, override uploadImageFile in ImageUploader to use adminUploadProfileImage
  const uploadImageFileAdmin = async (file: File) => {
    if (!token) throw new Error("Authentication token not available.");
    if (!profileId)
      throw new Error("Profile ID not available for admin upload.");
    await adminUploadProfileImage({ token, profileId, file });
    showSuccessToast("Image uploaded successfully");
    await refetchImages();
  };

  // For admin, pass a dummy uploadImage (never called), and override uploadImageFile
  const isAdminRoute = pathname?.startsWith("/admin");
  const isAdminMode = isAdmin && profileId && isAdminRoute;

  // --- REWRITE: deleteImageMutation to fetch new images and send them to reorder after delete ---

  const deleteImageMutation = useMutation<string, Error, string>({
    mutationFn: async (imageId: string) => {
      if (!userId || !token) throw new Error("Missing userId or token");
      if (authIsAdmin && profileId) {
        // Use admin util for deleting images
        await deleteAdminProfileImageById({ token, profileId, imageId });
        return imageId;
      }
      // Default user delete
      const res = await fetch(`/api/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, imageId }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      return imageId;
    },
    onSuccess: async () => {
      // After delete, fetch the new images and send them to reorder
      try {
        await refetchImages();
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
                onFileSelect(file);
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
      {/* Render ProfileImageReorder component for displaying and reordering existing images */}

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
