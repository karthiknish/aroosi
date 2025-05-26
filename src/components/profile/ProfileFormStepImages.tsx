import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { ProfileImageReorder, Image } from "../ProfileImageReorder";
import type { ProfileFormValues } from "./ProfileForm";
import { Id } from "@/../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
  clerkUser?: { id: string };
  convexUserId: Id<"users">;
  handleImagesChanged: (newImageIds: string[]) => void;
  orderedImages: Image[];
  handleImageClick: (idx: number) => void;
  handleDeleteImage: (storageId: string) => void;
  deletingImageId: string | null;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  modalIndex: number;
  setModalIndex: (idx: number) => void;
  updateOrder: (args: {
    userId: Id<"users">;
    imageIds: string[];
  }) => Promise<unknown>;
  toast: { error: (msg: string) => void };
}

const ProfileFormStepImages: React.FC<Props> = ({
  form,
  clerkUser,
  convexUserId,
  handleImagesChanged,
  orderedImages,
  handleImageClick,
  handleDeleteImage,
  deletingImageId,
  modalOpen,
  setModalOpen,
  modalIndex,
  setModalIndex,
  updateOrder,
  toast,
}) => (
  <div className="space-y-4">
    {!(clerkUser && "id" in clerkUser) || !convexUserId ? (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    ) : (
      <>
        <ProfileImageUpload
          userId={convexUserId}
          onImagesChanged={handleImagesChanged}
        />
        <ProfileImageReorder
          images={orderedImages}
          userId={convexUserId}
          onReorder={async (newOrder) => {
            const newIds = newOrder as string[];
            handleImagesChanged(newIds);
            if (convexUserId) {
              try {
                await updateOrder({ userId: convexUserId, imageIds: newIds });
              } catch {
                toast.error("Failed to update image order");
              }
            }
          }}
          renderAction={(img, idx) => (
            <div className="relative group w-20 h-20">
              <img
                src={img.url || ""}
                alt="Profile preview"
                className="w-20 h-20 object-cover rounded-lg cursor-pointer border group-hover:brightness-90 transition"
                onClick={() => handleImageClick(idx)}
              />
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
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTitle className="sr-only">Profile Image</DialogTitle>
          <DialogContent className="max-w-2xl flex flex-col items-center justify-center bg-black/90 p-0">
            <div className="relative w-full flex items-center justify-center min-h-[400px]">
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                onClick={() =>
                  setModalIndex(
                    (modalIndex - 1 + orderedImages.length) %
                      orderedImages.length
                  )
                }
                aria-label="Previous image"
                disabled={orderedImages.length <= 1}
                style={{ opacity: orderedImages.length > 1 ? 1 : 0.5 }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <img
                src={orderedImages[modalIndex]?.url || ""}
                alt="Profile large preview"
                className="w-full h-[70vh] rounded-lg object-cover bg-black"
                style={{ margin: "0 auto" }}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                onClick={() =>
                  setModalIndex((modalIndex + 1) % orderedImages.length)
                }
                aria-label="Next image"
                disabled={orderedImages.length <= 1}
                style={{ opacity: orderedImages.length > 1 ? 1 : 0.5 }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="text-white text-center py-2 w-full bg-black/60 rounded-b-lg">
              {modalIndex + 1} / {orderedImages.length}
            </div>
          </DialogContent>
        </Dialog>
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

export default ProfileFormStepImages;
