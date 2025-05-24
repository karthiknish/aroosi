import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";

// If you get a type error for react-beautiful-dnd, you may need to install @types/react-beautiful-dnd
// npm install --save-dev @types/react-beautiful-dnd

type Image = {
  _id: string;
  url: string;
  storageId?: string;
};

type Props = {
  images: Image[];
  userId: Id<"users">;
  onReorder?: (newOrder: string[]) => void;
  renderAction?: (img: Image, idx: number) => React.ReactNode;
  isAdmin?: boolean;
  profileId?: Id<"profiles">;
};

function SortableImage({
  img,
  renderAction,
  idx,
}: {
  img: Image;
  renderAction?: (img: Image, idx: number) => React.ReactNode;
  idx: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    userSelect: "none" as React.CSSProperties["userSelect"],
    padding: 4,
    border: isDragging ? "2px solid #0070f3" : "1px solid #ccc",
    borderRadius: 8,
    background: "#fff",
    opacity: isDragging ? 0.7 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group"
    >
      {renderAction ? (
        renderAction(img, idx)
      ) : (
        <img
          src={img.url}
          alt=""
          style={{
            width: 100,
            height: 100,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      )}
    </div>
  );
}

export function ProfileImageReorder({
  images,
  userId,
  onReorder,
  renderAction,
  isAdmin = false,
  profileId,
}: Props) {
  const updateProfile = useMutation(api.users.updateProfile);
  const adminUpdateProfile = useMutation(api.users.adminUpdateProfile);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img._id === active.id);
    const newIndex = images.findIndex((img) => img._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrdered = arrayMove(images, oldIndex, newIndex);
    const newStorageOrder = newOrdered
      .map((img) => img.storageId)
      .filter((id): id is Id<"_storage"> => Boolean(id));
    try {
      if (isAdmin && profileId) {
        await adminUpdateProfile({
          id: profileId,
          updates: { profileImageIds: newStorageOrder },
        });
      } else {
        await updateProfile({ profileImageIds: newStorageOrder });
      }
      toast.success("Image order updated");
      if (onReorder) onReorder(newOrdered.map((img) => img._id));
    } catch (e) {
      toast.error("Failed to update image order");
    }
  };

  if (!images || images.length === 0) {
    return <div style={{ color: "#888", padding: 16 }}>No images found</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map((img) => img._id)}
        strategy={horizontalListSortingStrategy}
      >
        <div style={{ display: "flex", gap: 16 }} className="profile-images">
          {images.map((img, idx) => (
            <SortableImage
              key={img._id}
              img={img}
              renderAction={renderAction}
              idx={idx}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
