import React from "react";
import { Trash2 } from "lucide-react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import type { ProfileFormValues } from "./ProfileForm";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import type { UseFormReturn } from "react-hook-form";
import type { ImageType } from "@/types/image";
import { useAuthContext } from "@/components/AuthProvider";

interface Props {
  images: ImageType[];
  onImageUpload: (file: File) => Promise<void>;
  onImageDelete: (imageId: string) => Promise<void>;
  onImageReorder?: (newOrder: ImageType[]) => void;
  isLoading: boolean;
}

const ProfileFormStepImages: React.FC<Props> = ({
  images = [],
  onImageUpload,
  onImageDelete,
  onImageReorder,
  isLoading,
}) => {
  const { profile } = useAuthContext();
  const userId = profile?.id || "user-id-placeholder";

  const handleFileSelect = async (file: File) => {
    try {
      await onImageUpload(file);
    } catch (error: unknown) {
      console.error("Error uploading image:", error as Error);
      // Handle error (e.g., show toast notification)
    }
  };

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
        userId={userId}
        onReorder={onImageReorder}
        renderAction={(image: ImageType) => (
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onImageDelete(image.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      />
      {images.length < 6 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <ProfileImageUpload
            onFileSelect={handleFileSelect}
            className="w-full h-48"
          />
        </div>
      )}
      {images.length > 1 && (
        <div className="text-sm text-gray-500">
          The first image will be your profile picture.
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Please upload at least one clear photo of yourself. First image will be
        your main profile picture.
      </p>
    </div>
  );
};

export default ProfileFormStepImages;
