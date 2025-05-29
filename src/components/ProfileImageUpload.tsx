import React, { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";
import { ImageDeleteConfirmation } from "./ImageDeleteConfirmation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToken } from "@/components/TokenProvider";

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
};

export function ProfileImageUpload({
  userId,
  isAdmin = false,
  profileId,
  onImagesChanged,
}: ProfileImageUploadProps) {
  const token = useToken();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [orderedImages, setOrderedImages] = useState<ImageData[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(-1);

  // Fetch images from API
  const fetchImages = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/profile-detail/${userId}/images`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setOrderedImages(
        (data.userProfileImages || []).filter(
          (img: ImageData) => !!img.url && !!img.storageId
        )
      );
    } else {
      setOrderedImages([]);
    }
  }, [userId, token]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Notify parent component about the image IDs change
  const profileImageIds = useMemo(() => {
    return orderedImages.map((img) => img.storageId);
  }, [orderedImages]);

  useEffect(() => {
    if (onImagesChanged) {
      onImagesChanged(profileImageIds);
    }
  }, [profileImageIds, onImagesChanged]);

  // Handle image deletion
  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    setIsUploading(true);
    try {
      const res = await fetch(`/api/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, imageId: pendingDeleteId }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      const newOrderedImages = orderedImages.filter(
        (img) => img.storageId !== pendingDeleteId
      );
      setOrderedImages(newOrderedImages);
      // Update profile image order
      const newStorageOrder = newOrderedImages.map((img) => img.storageId);
      const updateUrl =
        isAdmin && profileId ? `/api/admin/profiles` : `/api/profile`;
      const updateBody =
        isAdmin && profileId
          ? { id: profileId, updates: { profileImageIds: newStorageOrder } }
          : { profileImageIds: newStorageOrder };
      await fetch(updateUrl, {
        method: isAdmin && profileId ? "PUT" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateBody),
      });
      if (onImagesChanged) onImagesChanged(newStorageOrder);
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setIsUploading(false);
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    }
  }, [
    pendingDeleteId,
    orderedImages,
    isAdmin,
    profileId,
    onImagesChanged,
    userId,
    token,
  ]);

  // Memoize the ordered images
  const memoizedOrderedImages = useMemo(() => {
    const validImages = (orderedImages || []).filter((img) =>
      Boolean(img && img.url && img.storageId)
    );
    if (profileImageIds?.length > 0) {
      const imageMap = new Map(validImages.map((img) => [img.storageId, img]));
      return profileImageIds
        .map((id) => imageMap.get(id))
        .filter((img): img is ImageData => Boolean(img));
    }
    return validImages;
  }, [orderedImages, profileImageIds]);

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

  // Add generateUploadUrl and uploadImage for ImageUploader
  const generateUploadUrl = useCallback(async () => {
    const res = await fetch("/api/images/upload-url", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { success: false, error: "Failed to get upload URL" };
    }
    const data = await res.json();
    return data.uploadUrl as string;
  }, [token]);

  const uploadImage = useCallback(
    async ({
      userId,
      storageId,
      fileName,
      contentType,
      fileSize,
    }: {
      userId: string;
      storageId: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    }) => {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          storageId,
          fileName,
          contentType,
          fileSize,
        }),
      });
      if (!res.ok) {
        return {
          success: false,
          imageId: storageId,
          message: "Failed to upload image",
        };
      }
      const data = await res.json();
      return data;
    },
    [token]
  );

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
          userId={userId}
          orderedImages={orderedImages}
          isAdmin={isAdmin}
          profileId={profileId}
          onImagesChanged={onImagesChanged}
          setIsUploading={setIsUploading}
          toast={toast}
          disabled={isUploading || (orderedImages?.length ?? 0) >= 5}
          isUploading={isUploading}
          maxFiles={5}
          fetchImages={fetchImages}
          generateUploadUrl={generateUploadUrl}
          uploadImage={uploadImage}
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
