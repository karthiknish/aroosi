import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { ProfileImageReorder } from "./ProfileImageReorder";
import { ImageUploader } from "./ImageUploader";
import { ImageDeleteConfirmation } from "./ImageDeleteConfirmation";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageData {
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
  onImagesChanged?: () => void;
};

export function ProfileImageUpload({
  userId,
  isAdmin = false,
  profileId,
  onImagesChanged,
}: ProfileImageUploadProps) {
  // State for upload status
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Convex mutations
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadImage = useMutation(api.images.uploadProfileImage);
  const deleteImage = useMutation(api.images.deleteProfileImage);
  const updateProfile = useMutation(api.users.updateProfile);
  const adminUpdateProfile = useMutation(api.users.adminUpdateProfile);

  // Fetch profile images
  const imagesQuery = useQuery(api.images.getProfileImages, { userId });

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

  // Get profile image IDs
  const profileImageIds = useMemo(() => {
    return orderedImages.map((img) => img.storageId);
  }, [orderedImages]);

  // Sync orderedImages with images from server
  useEffect(() => {
    if (imagesQuery) {
      setOrderedImages(imagesQuery);
    }
  }, [imagesQuery]);

  // Handle image reordering
  const onReorder = useCallback(
    async (reorderedImages: ImageData[]) => {
      setOrderedImages(reorderedImages);
      const newOrder = reorderedImages.map(
        (img) => img.storageId as Id<"_storage">
      );

      try {
        if (isAdmin && profileId) {
          await adminUpdateProfile({
            id: profileId,
            updates: { profileImageIds: newOrder },
          });
        } else {
          await updateProfile({ profileImageIds: newOrder });
        }
        if (onImagesChanged) onImagesChanged();
      } catch (error) {
        console.error("Error updating image order:", error);
        toast.error("Failed to update image order");
      }
    },
    [isAdmin, profileId, onImagesChanged, adminUpdateProfile, updateProfile]
  );

  // Handle image deletion
  const confirmDelete = useCallback((id: Id<"_storage">) => {
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteImage({ userId, imageId: pendingDeleteId });
      const newOrderedImages = orderedImages.filter(
        (img) => img.storageId !== pendingDeleteId
      );
      setOrderedImages(newOrderedImages);
      const newStorageOrder = newOrderedImages.map((img) => img.storageId);

      if (isAdmin && profileId) {
        await adminUpdateProfile({
          id: profileId,
          updates: { profileImageIds: newStorageOrder },
        });
      } else {
        await updateProfile({ profileImageIds: newStorageOrder });
      }

      if (onImagesChanged) onImagesChanged();
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
    userId,
    orderedImages,
    isAdmin,
    profileId,
    adminUpdateProfile,
    updateProfile,
    onImagesChanged,
  ]);

  const images = imagesQuery || [];

  // Memoize the ordered images based on profileImageIds or use default order
  const memoizedOrderedImages = useMemo(() => {
    const validImages = images.filter((img): img is ImageData =>
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

  // Helper to open modal for a specific image
  const openImageModal = (imgUrl: string, idx: number) => {
    setSelectedImageUrl(imgUrl);
    setSelectedImageIdx(idx);
    setViewImageModalOpen(true);
  };

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
          userId={userId}
          orderedImages={orderedImages}
          isAdmin={isAdmin}
          profileId={profileId}
          onImagesChanged={onImagesChanged}
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

      {/* Image Reorder and List */}
      <div className="mt-4">
        <ProfileImageReorder
          images={memoizedOrderedImages}
          onReorder={onReorder}
          onDelete={confirmDelete}
          isAdmin={isAdmin}
          renderAction={(img, idx) => (
            <img
              src={img.url}
              alt="Profile preview"
              className="w-20 h-20 object-cover rounded-lg cursor-pointer border"
              onClick={() => openImageModal(img.url, idx)}
            />
          )}
        />
      </div>

      {/* View Large Image Modal */}
      <Dialog open={viewImageModalOpen} onOpenChange={setViewImageModalOpen}>
        <DialogContent className="max-w-2xl flex flex-col items-center justify-center relative">
          {selectedImageUrl && (
            <>
              <div className="flex items-center justify-center w-full">
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
                  className="max-h-[70vh] max-w-full rounded-lg"
                  style={{ objectFit: "contain" }}
                />
                <button
                  onClick={goToNextImage}
                  disabled={
                    selectedImageIdx >= memoizedOrderedImages.length - 1
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white disabled:opacity-50 z-10"
                  aria-label="Next image"
                >
                  &#8594;
                </button>
              </div>
            </>
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
