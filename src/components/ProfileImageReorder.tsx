import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useAuthContext } from "./AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2, Grip } from "lucide-react";
// Use the correct import for the modal
import ImageDeleteConfirmation from "@/components/ImageDeleteConfirmation";
import ProfileImageModal from "@/components/ProfileImageModal";
import type { ImageType } from "@/types/image";

type Props = {
  images: ImageType[];
  userId: string;
  onReorder?: (newOrder: ImageType[]) => void;
  renderAction?: (img: ImageType, idx: number) => React.ReactNode;
  onDeleteImage?: (imageId: string) => void;
  isAdmin?: boolean;
  profileId?: string;
  loading?: boolean;
};

const SortableImage = ({
  img,
  onDeleteImage,
  isDragging = false,
  imageIndex,
  setModalState,
}: {
  img: ImageType;
  onDeleteImage?: (id: string) => void;
  isDragging?: boolean;
  allImages: ImageType[];
  imageIndex: number;
  setModalState: React.Dispatch<
    React.SetStateAction<{ open: boolean; index: number }>
  >;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndDragging,
  } = useSortable({ id: img.id });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || dndDragging ? 0.8 : 1,
    zIndex: isDragging || dndDragging ? 1 : "auto",
    width: "100%",
    height: "100%",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      {...attributes}
      {...listeners}
    >
      <div className="absolute -left-2 -top-2 p-2 cursor-grab active:cursor-grabbing z-10 opacity-100 group-hover:opacity-100 transition-opacity">
        <Grip className="w-4 h-4 text-gray-400" />
      </div>
      <img
        src={img.url}
        alt={`Profile`}
        className="w-full h-full object-cover rounded-lg border border-gray-200 cursor-pointer"
        onClick={() => setModalState({ open: true, index: imageIndex })}
      />
      {onDeleteImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirmation(true);
          }}
          // Make the delete button always visible by removing group-hover and opacity classes
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:opacity-75 transition-opacity z-30"
          aria-label="Remove image"
          tabIndex={0}
          type="button"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {/* Use the correct modal import and props */}
      <ImageDeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={async () => {
          await onDeleteImage?.(img.id);
          setShowDeleteConfirmation(false);
        }}
      />
    </div>
  );
};

export function ProfileImageReorder({
  images,
  userId,
  onReorder,
  onDeleteImage,
  loading = false,
}: Props) {
  const { token } = useAuthContext();
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderedImages, setOrderedImages] = useState<ImageType[]>(images);

  // Modal state for swiping through images
  const [modalState, setModalState] = useState<{
    open: boolean;
    index: number;
  }>({
    open: false,
    index: 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (loading || isReordering) return;

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedImages.findIndex((img) => img.id === active.id);
      const newIndex = orderedImages.findIndex((img) => img.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrdered = arrayMove(orderedImages, oldIndex, newIndex);
      const newStorageOrder = newOrdered.map((img) => img.id);

      setOrderedImages(newOrdered);
      if (onReorder) onReorder(newOrdered);

      try {
        setIsReordering(true);
        setError(null);

        if (!token) {
          throw new Error("Authentication required. Please sign in again.");
        }

        const res = await fetch("/api/images/order", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, imageIds: newStorageOrder }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update image order");
        }

        toast.success("Image order updated successfully");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update image order";
        console.error("Error updating image order:", errorMessage);
        setError(errorMessage);
        toast.error(`Failed to update order: ${errorMessage}`);

        setOrderedImages(images);
        if (onReorder) onReorder(images);
      } finally {
        setIsReordering(false);
      }
    },
    [orderedImages, loading, isReordering, onReorder, token, userId, images]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-24 h-24 rounded-lg" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!orderedImages || orderedImages.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">No images to display</div>
    );
  }

  // Prepare images for modal swiping
  const modalImages = orderedImages.map((img) => ({
    url: img.url,
    name: "Profile Image",
  }));

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedImages.map((img) => img.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-4">
            {orderedImages.map((img, idx) => (
              <div key={img.id} style={{ width: 100, height: 100 }}>
                <SortableImage
                  img={img}
                  onDeleteImage={onDeleteImage}
                  allImages={orderedImages}
                  imageIndex={idx}
                  setModalState={setModalState}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ProfileImageModal
        isOpen={modalState.open}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        images={modalImages}
        initialIndex={modalState.index}
        // If your ProfileImageModal supports a prop for currentIndex and onIndexChange, you can add them here for full swipe support.
      />
      {isReordering && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-gray-600">Updating image order...</span>
        </div>
      )}
      {error && (
        <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <p className="font-medium">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
