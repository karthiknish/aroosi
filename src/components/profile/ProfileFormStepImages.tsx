import React from "react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import type { ImageType } from "@/types/image";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";

interface Props {
  images: ImageType[];
  onImageDelete?: (imageId: string) => Promise<void>;
  onImageReorder?: (newOrder: ImageType[]) => void;
  onImagesChanged?: (images: ImageType[] | string[]) => void;
  isLoading: boolean;
  isAdmin?: boolean;
  profileId?: string;
}

const ProfileFormStepImages: React.FC<Props> = ({
  images = [],
  onImageDelete,
  onImageReorder,
  onImagesChanged,
  isLoading,
  profileId,
}) => {
  const { profile: rawProfile, isAdmin } = useAuthContext();
  const profile = rawProfile as { userId?: string } | null;
  const userId = profile?.userId || "user-id-placeholder";

  // Notify parent of image changes (run even during loading to reset state)
  React.useEffect(() => {
    onImagesChanged?.(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(images)]);

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
      {images.length > 0 && (
        <ProfileImageReorder
          images={images}
          userId={userId}
          onReorder={onImageReorder}
          onDeleteImage={onImageDelete}
          isAdmin={isAdmin}
        />
      )}
      {images.length < 5 && (
        <div className="w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <ProfileImageUpload
            userId={userId}
            isAdmin={isAdmin}
            profileId={profileId}
            mode="edit"
            onImagesChanged={onImagesChanged}
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
        Upload photos to make your profile more attractive. First image will be
        your main profile picture. Photos are optional but recommended.
      </p>
    </div>
  );
};

export default ProfileFormStepImages;
