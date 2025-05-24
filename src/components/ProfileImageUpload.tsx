import { useCallback, useEffect, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";
import { ProfileImageReorder } from "./ProfileImageReorder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProfileImageUploadProps {
  userId: Id<"users">;
  isAdmin?: boolean;
  profileId?: Id<"profiles">;
  profileImageIds?: string[];
  onImagesChanged?: () => void;
}

interface ImageData {
  _id: Id<"images">;
  storageId: Id<"_storage">;
  url: string | null;
}

export function ProfileImageUpload({
  userId,
  isAdmin = false,
  profileId,
  profileImageIds,
  onImagesChanged,
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const imagesQuery = useQuery(api.images.getProfileImages, { userId });
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadImage = useMutation(api.images.uploadProfileImage);
  const deleteImage = useMutation(api.images.deleteProfileImage);
  const updateProfile = useMutation(api.users.updateProfile);
  const adminUpdateProfile = useMutation(api.users.adminUpdateProfile);

  // Local state for ordered images
  const [orderedImages, setOrderedImages] = useState<ImageData[]>([]);
  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"_storage"> | null>(
    null
  );

  // Sync orderedImages with images from server
  useEffect(() => {
    if (imagesQuery && imagesQuery.length > 0) {
      setOrderedImages(
        imagesQuery.map((img) => ({
          ...img,
          storageId: img.storageId as Id<"_storage">,
        }))
      );
    } else {
      setOrderedImages([]);
    }
  }, [imagesQuery]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!userId) return;
      const currentImages = orderedImages || [];
      if (currentImages.length + acceptedFiles.length > 5) {
        toast.error("You can only upload up to 5 images");
        return;
      }
      setIsUploading(true);
      try {
        const newImageIds: Id<"_storage">[] = [];
        for (const file of acceptedFiles) {
          const uploadUrl = await generateUploadUrl();
          if (typeof uploadUrl !== "string") {
            throw new Error("Failed to get upload URL");
          }
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!result.ok) {
            throw new Error("Failed to upload image");
          }
          const { storageId } = await result.json();
          newImageIds.push(storageId as Id<"_storage">);
          await uploadImage({
            userId,
            storageId,
            fileName: file.name,
          });
        }
        // Update the profile with the new image IDs (append to current order)
        const currentImageIds = orderedImages.map(
          (img) => img.storageId as Id<"_storage">
        );
        const newOrder = [...currentImageIds, ...newImageIds];
        if (isAdmin && profileId) {
          await adminUpdateProfile({
            id: profileId,
            updates: { profileImageIds: newOrder },
          });
          if (onImagesChanged) onImagesChanged();
        } else {
          await updateProfile({ profileImageIds: newOrder });
          if (onImagesChanged) onImagesChanged();
        }
        toast.success("Images uploaded successfully");
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error("Failed to upload images");
      } finally {
        setIsUploading(false);
      }
    },
    [
      userId,
      orderedImages,
      generateUploadUrl,
      uploadImage,
      updateProfile,
      isAdmin,
      profileId,
      adminUpdateProfile,
      onImagesChanged,
    ]
  );

  // Open modal to confirm deletion
  const confirmDelete = (storageId: Id<"_storage">) => {
    setPendingDeleteId(storageId);
    setDeleteModalOpen(true);
  };

  // Delete image and update order in server and local state
  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteImage({ userId, imageId: pendingDeleteId });
      const newOrderedImages = orderedImages.filter(
        (img) => img.storageId !== pendingDeleteId
      );
      setOrderedImages(newOrderedImages);
      const newStorageOrder = newOrderedImages.map((img) => img.storageId);
      await updateProfile({ profileImageIds: newStorageOrder });
      if (onImagesChanged) onImagesChanged();
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setDeleteModalOpen(false);
      setPendingDeleteId(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 2 * 1024 * 1024, // 2MB
    multiple: false,
    disabled: isUploading || (orderedImages?.length ?? 0) >= 5,
  });

  const images = imagesQuery || [];
  const memoizedOrderedImages = useMemo(() => {
    if (profileImageIds && profileImageIds.length > 0) {
      const imageMap = Object.fromEntries(
        images.map((img) => [String(img.storageId), img])
      );
      return profileImageIds
        .map((id) => imageMap[String(id)])
        .filter(Boolean)
        .map((img) => ({
          _id: String(img._id),
          url: img.url || "",
          storageId: img.storageId,
        }));
    }
    return images && images.length > 0
      ? images.map((img) => ({
          _id: String(img._id),
          url: img.url || "",
          storageId: img.storageId,
        }))
      : [];
  }, [images, profileImageIds]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }
          ${isUploading || (orderedImages?.length ?? 0) >= 5 ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Uploading...</p>
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <p>
            {orderedImages?.length === 5
              ? "Maximum number of images reached"
              : "Drag & drop an image here, or click to select"}
          </p>
        )}
      </div>
      {/* Single drag-and-drop row with delete buttons */}
      <ProfileImageReorder
        images={memoizedOrderedImages}
        userId={userId}
        isAdmin={isAdmin}
        profileId={profileId}
        renderAction={(img) =>
          img.storageId ? (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => confirmDelete(img.storageId as Id<"_storage">)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null
        }
      />
      {/* Confirm delete modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this image? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
