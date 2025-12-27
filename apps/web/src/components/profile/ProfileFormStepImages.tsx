import React from "react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";

interface Props {
  images: ProfileImageInfo[];
  onImageDelete?: (imageId: string) => Promise<void>;
  onImageReorder?: (newOrder: ProfileImageInfo[]) => void;
  onImagesChanged?: (images: ProfileImageInfo[] | string[]) => void;
  isLoading: boolean;
  isAdmin?: boolean;
  profileId?: string;
  renderAction?: (img: ProfileImageInfo, idx: number) => React.ReactNode;
}

const ProfileFormStepImages: React.FC<Props> = ({
  images = [],
  onImageDelete,
  onImageReorder,
  onImagesChanged,
  isLoading,
  profileId,
  renderAction,
}) => {
  const { profile: rawProfile, isAdmin } = useAuthContext();
  const profile = rawProfile as { userId?: string } | null;
  // Use profileId prop if provided, otherwise fall back to auth context
  const userId = profileId || profile?.userId || "user-id-placeholder";

  // Notify parent of image changes (run even during loading to reset state)
  React.useEffect(() => {
    onImagesChanged?.(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(images)]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-neutral/5 rounded-lg animate-pulse" />
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
          renderAction={renderAction}
        />
      )}
      {images.length < 5 && (
        <div className="w-full border-2 border-dashed border-neutral/20 rounded-lg flex items-center justify-center">
          <ProfileImageUpload
            userId={userId}
            isAdmin={isAdmin}
            profileId={profileId}
            mode="edit"
            uploaderMode="local"
            onImagesChanged={onImagesChanged}
            className="w-full h-48"
          />
        </div>
      )}
      {images.length > 1 && (
        <div className="text-sm text-neutral">
          The first image will be your profile picture.
        </div>
      )}
      <p className="text-xs text-neutral mt-2">
        Upload photos to make your profile more attractive. First image will be
        your main profile picture. Photos are optional but recommended.
      </p>
    </div>
  );
};

export default ProfileFormStepImages;
