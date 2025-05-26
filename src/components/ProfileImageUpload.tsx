import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";
import { ImageDeleteConfirmation } from "./ImageDeleteConfirmation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ImageData {
  _id: Id<"images"> | string;
  _creationTime?: number;
  storageId: Id<"_storage"> | string;
  url: string;
  fileName?: string;
  uploadedAt?: number;
}

type ProfileImageUploadProps = {
  userId: Id<"users">;
  profileId?: Id<"profiles">;
  isAdmin?: boolean;
  onImagesChanged?: (newImageIds: string[]) => void;
};

export function ProfileImageUpload({
  userId,
  isAdmin = false,
  profileId,
  onImagesChanged,
}: ProfileImageUploadProps) {
  // State for upload status
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // If admin and profileId is provided, fetch the userId for that profile
  const profileQuery = useQuery(
    api.users.getProfileById,
    isAdmin && profileId ? { id: profileId } : "skip"
  );
  const effectiveUserId =
    isAdmin && profileQuery?.userId ? profileQuery.userId : userId;

  // Convex mutations
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadImage = useMutation(api.images.uploadProfileImage);
  const deleteImage = useMutation(api.images.deleteProfileImage);
  const updateProfile = useMutation(api.users.updateProfile);
  const adminUpdateProfile = useMutation(api.users.adminUpdateProfile);

  // Fetch profile images
  const imagesQuery = useQuery(api.images.getProfileImages, {
    userId: effectiveUserId,
  });

  // Local state for ordered images
  const [orderedImages, setOrderedImages] = useState<ImageData[]>([]);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"_storage"> | null>(
    null
  );

  // Modal state for viewing large image
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(-1);

  // Get profile image IDs as Id<_storage>[]
  const profileImageIds = useMemo(() => {
    return orderedImages.map((img) => img.storageId as Id<"_storage">);
  }, [orderedImages]);

  // Notify parent component about the image IDs change (side effect, not during render)
  useEffect(() => {
    if (onImagesChanged) {
      onImagesChanged(profileImageIds.map(String));
    }
  }, [profileImageIds, onImagesChanged]);

  // Sync orderedImages with images from server
  useEffect(() => {
    if (imagesQuery) {
      setOrderedImages(
        (imagesQuery as ImageData[]).filter(
          (img) => !!img.url && !!img.storageId
        )
      );
    }
  }, [imagesQuery]);

  // Handle image deletion
  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteImage({ userId: effectiveUserId, imageId: pendingDeleteId });
      const newOrderedImages = orderedImages.filter(
        (img) => img.storageId !== pendingDeleteId
      );
      setOrderedImages(newOrderedImages);
      const newStorageOrder = newOrderedImages.map(
        (img) => img.storageId as Id<"_storage">
      );
      if (isAdmin && profileId) {
        await adminUpdateProfile({
          id: profileId,
          updates: { profileImageIds: newStorageOrder },
        });
      } else {
        await updateProfile({ profileImageIds: newStorageOrder });
      }
      if (onImagesChanged) onImagesChanged(newStorageOrder.map(String));
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    }
  }, [
    pendingDeleteId,
    deleteImage,
    orderedImages,
    isAdmin,
    profileId,
    adminUpdateProfile,
    updateProfile,
    onImagesChanged,
    effectiveUserId,
  ]);

  const images = useMemo(() => imagesQuery || [], [imagesQuery]);

  // Memoize the ordered images based on profileImageIds or use default order
  const memoizedOrderedImages = useMemo(() => {
    const validImages = (images as ImageData[]).filter((img) =>
      Boolean(img && img.url && img.storageId)
    );

    if (profileImageIds?.length > 0) {
      const imageMap = new Map(validImages.map((img) => [img.storageId, img]));
      return profileImageIds
        .map((id) => imageMap.get(id as Id<"_storage">))
        .filter((img): img is ImageData => Boolean(img));
    }

    return validImages;
  }, [images, profileImageIds]);

  // Helper to go to previous/next image
  const goToPrevImage = () => {
    if (selectedImageIdx > 0) {
      const prevIdx = selectedImageIdx - 1;
      setSelectedImageIdx(prevIdx);
      setSelectedImageUrl(memoizedOrderedImages[prevIdx]?.url || null);
    }
  };
  const goToNextImage = () => {
    if (selectedImageIdx < memoizedOrderedImages.length - 1) {
      const nextIdx = selectedImageIdx + 1;
      setSelectedImageIdx(nextIdx);
      setSelectedImageUrl(memoizedOrderedImages[nextIdx]?.url || null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Profile Photos</h3>
          <span className="text-xs text-muted-foreground">
            {orderedImages?.length ?? 0} of 5 photos
          </span>
        </div>
        <ImageUploader
          userId={effectiveUserId}
          orderedImages={orderedImages}
          isAdmin={isAdmin}
          profileId={profileId}
          onImagesChanged={
            onImagesChanged
              ? () =>
                  onImagesChanged(
                    orderedImages.map((img) => String(img.storageId))
                  )
              : undefined
          }
          generateUploadUrl={generateUploadUrl}
          uploadImage={uploadImage}
          updateProfile={updateProfile}
          adminUpdateProfile={adminUpdateProfile}
          setIsUploading={setIsUploading}
          toast={toast}
          disabled={isUploading || (orderedImages?.length ?? 0) >= 5}
          isUploading={isUploading}
          maxFiles={5}
        />
        {/* Upload limit indicator */}
        <div className="flex justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {orderedImages?.length === 0
              ? "Upload at least 1 photo"
              : `Upload up to ${5 - (orderedImages?.length || 0)} more`}
          </p>
          <p className="text-xs text-muted-foreground">
            {5 - (orderedImages?.length || 0)} remaining
          </p>
        </div>
      </div>

      {/* View Large Image Modal */}
      <Dialog open={viewImageModalOpen} onOpenChange={setViewImageModalOpen}>
        <DialogContent className="max-w-2xl w-full flex flex-col items-center justify-center relative">
          <DialogHeader>
            <DialogTitle className="sr-only">Profile Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImageUrl && (
            <div className="flex items-center justify-center w-full max-w-full max-h-[80vh] min-h-[300px]">
              <button
                onClick={goToPrevImage}
                disabled={selectedImageIdx <= 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white disabled:opacity-50 z-10"
                aria-label="Previous image"
              >
                &#8592;
              </button>
              <img
                src={selectedImageUrl}
                alt="Large profile preview"
                className="max-h-[70vh] max-w-full rounded-lg mx-auto"
                style={{ objectFit: "contain" }}
              />
              <button
                onClick={goToNextImage}
                disabled={selectedImageIdx >= memoizedOrderedImages.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white disabled:opacity-50 z-10"
                aria-label="Next image"
              >
                &#8594;
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
