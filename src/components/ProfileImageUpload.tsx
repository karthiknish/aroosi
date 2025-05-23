import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";

interface ProfileImageUploadProps {
  userId: Id<"users">;
}

interface ImageData {
  _id: Id<"images">;
  storageId: string;
  url: string | null;
}

export function ProfileImageUpload({ userId }: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const images = useQuery(api.images.getProfileImages, { userId });
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const uploadImage = useMutation(api.images.uploadProfileImage);
  const deleteImage = useMutation(api.images.deleteProfileImage);
  const updateProfile = useMutation(api.users.updateProfile);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!userId) return;

      // Check if adding these files would exceed the limit
      const currentImages = images || [];
      if (currentImages.length + acceptedFiles.length > 5) {
        toast.error("You can only upload up to 5 images");
        return;
      }

      setIsUploading(true);
      try {
        const newImageIds: Id<"_storage">[] = [];
        for (const file of acceptedFiles) {
          // Step 1: Get the upload URL
          const uploadUrl = await generateUploadUrl();

          // Step 2: Upload the file to storage
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

          // Step 3: Save the image reference to the database
          await uploadImage({
            userId,
            storageId,
            fileName: file.name,
          });
        }

        // Step 4: Update the profile with the new image IDs
        const currentImageIds =
          images?.map((img) => img.storageId as Id<"_storage">) || [];
        await updateProfile({
          profileImageIds: [...currentImageIds, ...newImageIds],
        });

        toast.success("Images uploaded successfully");
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error("Failed to upload images");
      } finally {
        setIsUploading(false);
      }
    },
    [userId, images, generateUploadUrl, uploadImage, updateProfile]
  );

  const handleDelete = async (imageId: Id<"_storage">) => {
    try {
      await deleteImage({ userId, imageId });

      // Update the profile to remove the deleted image ID
      const currentImageIds =
        images?.map((img) => img.storageId as Id<"_storage">) || [];
      await updateProfile({
        profileImageIds: currentImageIds.filter((id) => id !== imageId),
      });

      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
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
    disabled: isUploading || (images?.length ?? 0) >= 5,
  });

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
          ${isUploading || (images?.length ?? 0) >= 5 ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Uploading...</p>
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <p>
            {images?.length === 5
              ? "Maximum number of images reached"
              : "Drag & drop an image here, or click to select"}
          </p>
        )}
      </div>

      {images && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {images.map(({ storageId, url }: ImageData) => (
            <div
              key={storageId as Id<"_storage">}
              className="relative group aspect-square"
            >
              <Image
                src={url || ""}
                alt="Profile"
                fill
                className="object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(storageId as Id<"_storage">)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
