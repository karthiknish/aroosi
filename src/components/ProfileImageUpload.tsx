import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";
import { ImageDeleteConfirmation } from "./ImageDeleteConfirmation";
import { useToken } from "@/components/TokenProvider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Id } from "@/../convex/_generated/dataModel";


export interface ImageData {
  _id: string;
  _creationTime?: number;
  storageId: string;
  url: string;
  fileName?: string;
  uploadedAt?: number;
}

type ProfileImageUploadProps = {
  userId: string;
  profileId?: string;
  isAdmin?: boolean;
  onImagesChanged?: (newImageIds: string[]) => void;
  adminUpdateProfile?: (args: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => Promise<unknown>;
  mode?: "create" | "edit";
  uploadImage: (args: {
    userId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<{ success: boolean; imageId: Id<"_storage">; message: string }>;
};

export function ProfileImageUpload({
  userId,
  isAdmin = false,
  profileId,
  onImagesChanged,
  adminUpdateProfile,
  mode = "edit",
}: ProfileImageUploadProps) {
  const token = useToken();
  const router = useRouter();
  // All hooks must be called unconditionally at the top
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(-1);
  const [hasInitialized] = useState(false);
  const lastNotifiedImageIds = useRef<string>("");
  const [uploading, setUploading] = useState(false);
  const prevImageCount = useRef<number>(0);
  const MAX_IMAGES_PER_USER = 5;

  const { data: orderedImages = [], refetch: refetchImages } = useQuery({
    queryKey: ["profileImages", userId, token],
    queryFn: async () => {
      if (!token || !userId) return [];
      console.log(
        "[ProfileImageUpload] Fetching profile images for userId:",
        userId
      );
      const res = await fetch(`/api/profile-detail/${userId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.userProfileImages || []).filter(
        (img: ImageData) => !!img.url && !!img.storageId
      );
    },
    enabled: mode === "edit" && !!token && !!userId,
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserWithProfile"],
    queryFn: async () => {
      if (!token) return null;
      return await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json());
    },
  });

  // Mutation for deleting images
  const deleteImageMutation = useMutation<string, Error, string>({
    mutationFn: async (imageId: string) => {
      if (!userId || !token) throw new Error("Missing userId or token");
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
      await refetchImages();
      toast.success("Image deleted successfully");
      setIsUploading(false);
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete image");
      setIsUploading(false);
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    },
  });

  // Mutation for updating image order
  const updateImageOrderMutation = useMutation<
    {
      success: boolean;
      message: string;
    },
    Error,
    string[]
  >({
    mutationFn: async (newImageIds: string[]) => {
      if (!userId || !token) throw new Error("Missing userId or token");
      console.log(
        "[ProfileImageUpload] Calling /api/images/order PUT route with new image IDs:",
        newImageIds
      );
      const res = await fetch("/api/images/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, imageIds: newImageIds }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(
          "[ProfileImageUpload] /api/images/order PUT failed:",
          errorData
        );
        throw new Error(
          errorData.error || "Failed to update image order via API"
        );
      }

      const data = await res.json();
      console.log(
        "[ProfileImageUpload] /api/images/order PUT successful:",
        data
      );
      return data; // API route should return success status
    },
    onSuccess: () => {
      toast.success("Image order updated successfully");
      // Refetch images after order update to ensure UI is in sync
      refetchImages();
    },
    onError: (error) => {
      console.error("[ProfileImageUpload] Image order update failed:", error);
      toast.error("Failed to update image order");
    },
  });

  // Handler for when ProfileImageReorder reports image order changes
  const handleImagesReordered = useCallback(
    (newImageIds: string[]) => {
      console.log(
        "[ProfileImageUpload] Images reordered, updating database with IDs:",
        newImageIds
      );
      // Call the mutation to update the order in the database
      updateImageOrderMutation.mutate(newImageIds);
    },
    [updateImageOrderMutation]
  );

  // Handler for deleting an image via ProfileImageReorder
  const handleDeleteImage = useCallback(
    (imageId: string) => {
      console.log("[ProfileImageUpload] Deleting image with ID:", imageId);
      deleteImageMutation.mutate(imageId);
    },
    [deleteImageMutation]
  );

  // Notify parent component about the image IDs change
  const profileImageIds = useMemo(() => {
    return orderedImages.map((img: ImageData) => img.storageId);
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
        if (uploading && profileImageIds.length > prevImageCount.current) {
          toast.success("Image uploaded successfully");
          setUploading(false);
        }
        prevImageCount.current = profileImageIds.length;
      }
    }
  }, [profileImageIds, onImagesChanged, hasInitialized, uploading]);

  // Handle image deletion
  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    setIsUploading(true);
    deleteImageMutation.mutate(pendingDeleteId);
  }, [pendingDeleteId, deleteImageMutation]);

  // Memoize the ordered images
  const memoizedOrderedImages = useMemo(() => {
    const validImages = (orderedImages || []).filter((img: ImageData) =>
      Boolean(img && img.url && img.storageId)
    );
    if (profileImageIds?.length > 0) {
      const imageMap = new Map(
        validImages.map((img: ImageData) => [img.storageId, img])
      );
      return profileImageIds
        .map((id: string) => imageMap.get(id))
        .filter((img: ImageData | undefined): img is ImageData => Boolean(img));
    }
    return validImages;
  }, [orderedImages, profileImageIds]);

  // Helper to go to previous/next image
  const goToPrevImage = useCallback(() => {
    if (selectedImageIdx > 0) {
      setSelectedImageIdx(selectedImageIdx - 1);
      setSelectedImageUrl(
        memoizedOrderedImages[selectedImageIdx - 1]?.url || null
      );
    }
  }, [selectedImageIdx, memoizedOrderedImages]);
  const goToNextImage = useCallback(() => {
    if (selectedImageIdx < memoizedOrderedImages.length - 1) {
      setSelectedImageIdx(selectedImageIdx + 1);
      setSelectedImageUrl(
        memoizedOrderedImages[selectedImageIdx + 1]?.url || null
      );
    }
  }, [selectedImageIdx, memoizedOrderedImages]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.isProfileComplete) {
      router.replace("/"); // Redirect to homepage instead of create-profile
    }
  }, [currentUserProfile, router]);

  // Track when an upload is in progress
  const handleStartUpload = () => setUploading(true);

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

  // Define uploadImage to call our API route (this will be passed to ImageUploader)
  const uploadImage = useCallback(
    async (args: {
      userId: string;
      storageId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    }): Promise<{
      success: boolean;
      imageId: Id<"_storage">;
      message: string;
    }> => {
      if (!token) {
        throw new Error("Authentication token not available.");
      }
      console.log(
        "[ProfileImageUpload] Calling /api/images POST route with args:",
        args
      );
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
        console.error(
          "[ProfileImageUpload] /api/images POST failed:",
          errorData
        );
        throw new Error(errorData.error || "Failed to save image via API");
      }

      const data = await res.json();
      console.log("[ProfileImageUpload] /api/images POST successful:", data);
      // Ensure the data structure matches the expected return type
      if (
        typeof data.success !== "boolean" ||
        typeof data.imageId !== "string" ||
        typeof data.message !== "string"
      ) {
        throw new Error("Invalid response structure from /api/images");
      }
      // Cast imageId string to Id<"_storage"> here as we are asserting the structure
      return {
        success: data.success,
        imageId: data.imageId as Id<"_storage">,
        message: data.message,
      };
    },
    [token] // Dependency on token
  );

  // Ensure images are refetched after upload (This useEffect might be redundant now if ImageUploader handles it)
  useEffect(() => {
    if (uploading) {
      refetchImages();
    }
  }, [uploading, refetchImages]);

  // Guard: Only render if userId and token are present
  if (!userId || !token) {
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
            isAdmin={isAdmin}
            profileId={profileId}
            onImagesChanged={onImagesChanged}
            setIsUploading={setIsUploading}
            toast={toast}
            adminUpdateProfile={adminUpdateProfile}
            disabled={
              isUploading ||
              (memoizedOrderedImages?.length ?? 0) >= MAX_IMAGES_PER_USER
            }
            isUploading={isUploading}
            maxFiles={
              MAX_IMAGES_PER_USER - (memoizedOrderedImages?.length ?? 0)
            }
            fetchImages={refetchImages}
            generateUploadUrl={generateUploadUrl}
            uploadImage={uploadImage}
            onStartUpload={handleStartUpload}
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
