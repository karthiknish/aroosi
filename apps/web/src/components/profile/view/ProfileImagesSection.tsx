import React from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DisplaySection } from "./ProfileViewComponents";
import dynamic from "next/dynamic";
import type { ProfileImageInfo } from "@aroosi/shared/types";

const ProfileImageReorder = dynamic(
  () =>
    import("@/components/ProfileImageReorder").then(
      (m) => m.ProfileImageReorder
    ),
  { ssr: false }
);

interface ProfileImagesSectionProps {
  imageList: ProfileImageInfo[];
  userId: string;
  isLoadingImages?: boolean;
}

export const ProfileImagesSection: React.FC<ProfileImagesSectionProps> = ({
  imageList,
  userId,
  isLoadingImages,
}) => {
  const router = useRouter();

  return (
    <DisplaySection
      title={
        <span className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-accent" />
          Profile Images
        </span>
      }
      noBorder
      fullWidth
    >
      <div className="mt-2">
        {imageList.length > 0 ? (
          <ProfileImageReorder
            images={imageList}
            userId={userId}
            renderAction={() => null}
          />
        ) : isLoadingImages ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton
                key={idx}
                className="w-full aspect-square rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="w-full">
            <div className="border-2 border-dashed border-neutral/20 rounded-xl p-6 text-center bg-base-light/60">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-neutral/5 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-neutral-light" />
                </div>
                <p className="text-sm text-neutral-light">
                  You haven’t added any photos yet
                </p>
                <p className="text-xs text-neutral-light">
                  Add 2–6 clear photos to get more matches
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() =>
                      router.push("/profile/edit/images")
                    }
                    className="bg-primary hover:bg-primary-dark text-white"
                    size="sm"
                  >
                    Add Photos
                  </Button>
                  <Button
                    onClick={() => router.push("/profile/edit")}
                    variant="outline"
                    size="sm"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DisplaySection>
  );
};
