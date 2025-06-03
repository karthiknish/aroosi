import React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import type { ProfileFormValues } from "./ProfileForm";
import { useAuthContext } from "@/components/AuthProvider";
import { Id } from "@/../convex/_generated/dataModel";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";

export interface ImageType {
  id: string;
  url: string;
  name?: string;
  size?: number;
}

interface Props {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
  images: ImageType[];
  onImageUpload: (file: File) => Promise<void>;
  onImageDelete: (imageId: string) => Promise<void>;
  onImageReorder?: (newOrder: ImageType[]) => void;
  isLoading: boolean;
  mode: "create" | "edit";
}

const ProfileFormStepImages: React.FC<Props> = ({
  form,
  images = [],
  onImageUpload,
  onImageDelete,
  onImageReorder,
  isLoading,
  mode,
}) => {
  const { token } = useAuthContext();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(
    null
  );
  const [isUploading, setIsUploading] = React.useState(false);

  const handleDelete = async (imageId: string) => {
    try {
      setIsDeleting(true);
      setDeletingImageId(imageId);
      await onImageDelete(imageId);
    } finally {
      setIsDeleting(false);
      setDeletingImageId(null);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setIsUploading(true);
      await onImageUpload(file);
    } catch (error: unknown) {
      console.error("Error uploading image:", error as Error);
      // Handle error (e.g., show toast notification)
    } finally {
      setIsUploading(false);
    }
  };

  // Define uploadImage to call our API route
  const uploadImage = React.useCallback(
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
      const res = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(args),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (e) {
        // If JSON.parse fails, provide a more helpful error message
        throw new Error(
          "Failed to parse server response. Please try again later."
        );
      }

      if (!res.ok) {
        throw new Error((data && data.error) || "Failed to save image via API");
      }

      return {
        success: data.success,
        imageId: data.imageId as Id<"_storage">,
        message: data.message,
      };
    },
    [token]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileImageReorder
        images={images}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        deletingImageId={deletingImageId}
        onReorder={onImageReorder}
        renderImageActions={(image) => (
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleDelete(image.id)}
            disabled={isDeleting && deletingImageId === image.id}
          >
            {isDeleting && deletingImageId === image.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      />
      {images.length < 6 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <ProfileImageUpload
            onFileSelect={handleFileSelect}
            className="w-full h-48"
            disabled={isUploading}
          />
        </div>
      )}
      {images.length > 1 && (
        <div className="text-sm text-gray-500">
          The first image will be your profile picture.
        </div>
      )}
      {form.formState.errors.profileImageIds && (
        <p className="text-sm text-red-600 mt-2">
          {form.formState.errors.profileImageIds.message as string}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Please upload at least one clear photo of yourself. First image will be
        your main profile picture.
      </p>
    </div>
  );
};

export default ProfileFormStepImages;
