import React from "react";
import { Trash2 } from "lucide-react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { ProfileImageReorder, Image } from "../ProfileImageReorder";
import type { ProfileFormValues } from "./ProfileForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/components/TokenProvider";
import { Id } from "@/../convex/_generated/dataModel";

interface Props {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
  userId: string;
  handleImagesChanged: (newImageIds: string[]) => void;
  orderedImages: Image[];
  handleImageClick: (idx: number) => void;
  handleDeleteImage: (imageId: string) => void;
  deletingImageId: string | null;
  updateOrder: (args: { userId: string; imageIds: string[] }) => void;
  loading: boolean;
  reordering: boolean;
  mode: "create" | "edit";
}

const ProfileFormStepImages: React.FC<Props> = ({
  form,
  userId,
  handleImagesChanged,
  orderedImages,
  handleImageClick,
  handleDeleteImage,
  deletingImageId,
  updateOrder,
  loading,
  reordering,
  mode,
}) => {
  const token = useToken();

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
      console.log(
        "[ProfileFormStepImages] Calling /api/images POST route with args:",
        args
      );
      const res = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(args),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(
          "[ProfileFormStepImages] /api/images POST failed:",
          errorData
        );
        throw new Error(errorData.error || "Failed to save image via API");
      }

      const data = await res.json();
      console.log("[ProfileFormStepImages] /api/images POST successful:", data);
      return {
        success: data.success,
        imageId: data.imageId as Id<"_storage">,
        message: data.message,
      };
    },
    [token]
  );

  return (
    <div className="space-y-4">
      {/* Only render image upload UI if userId is present */}
      {!userId ? null : (
        <>
          <ProfileImageUpload
            userId={userId}
            onImagesChanged={handleImagesChanged}
            mode={mode}
            uploadImage={uploadImage}
          />
          {loading || reordering ? (
            <div className="flex gap-2 my-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-24 h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <ProfileImageReorder
              images={orderedImages}
              userId={userId}
              onReorder={(newOrder) =>
                updateOrder({ userId: userId, imageIds: newOrder })
              }
              loading={loading || reordering}
              renderAction={(img, idx) => (
                <div className="relative group w-20 h-20">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt="Profile preview"
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer border group-hover:brightness-90 transition"
                      onClick={() => handleImageClick(idx)}
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-lg border text-gray-400">
                      <span>No Image</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(String(img._id));
                    }}
                    aria-label="Delete image"
                    disabled={deletingImageId === String(img._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          )}
        </>
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
