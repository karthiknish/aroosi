import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { Id } from "@/../convex/_generated/dataModel";

// If you get a type error for react-beautiful-dnd, you may need to install @types/react-beautiful-dnd
// npm install --save-dev @types/react-beautiful-dnd

type Image = {
  _id: string;
  url: string;
  storageId?: string;
};

type Props = {
  images: Image[];
  onReorder: (newOrder: string[]) => void;
  renderAction?: (img: Image) => React.ReactNode;
};

export function ProfileImageReorder({
  images,
  onReorder,
  renderAction,
}: Props) {
  const [orderedImages, setOrderedImages] = useState<Image[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state with images prop when not dragging
  React.useEffect(() => {
    // Ensure images is not null/undefined and we are not currently dragging
    if (images && !isDragging) {
      // Only update if the images array reference is different
      // This is a shallow comparison, sufficient if the parent memoizes correctly.
      if (orderedImages !== images) {
        setOrderedImages(images);
      }
    }
  }, [images, isDragging, orderedImages]); // Include orderedImages in dependency array

  function handleOnDragStart() {
    setIsDragging(true);
  }

  function handleOnDragEnd(result: any) {
    setIsDragging(false);
    if (!result.destination) return;

    const items = Array.from(orderedImages);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update local state immediately for visual feedback
    setOrderedImages(items);

    // Notify parent of new order (using _id strings)
    onReorder(items.map((img) => img._id));
  }

  if (orderedImages.length === 0) {
    return <div style={{ color: "#888", padding: 16 }}>No images found</div>;
  }

  return (
    <DragDropContext
      onDragStart={handleOnDragStart}
      onDragEnd={handleOnDragEnd}
    >
      <Droppable droppableId="profile-images" direction="horizontal">
        {(provided: DroppableProvided) => (
          <div
            className="profile-images"
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{ display: "flex", gap: 16 }}
          >
            {orderedImages.map((img, idx) => (
              <Draggable
                key={String(img._id)}
                draggableId={String(img._id)}
                index={idx}
              >
                {(
                  provided: DraggableProvided,
                  snapshot: DraggableStateSnapshot
                ) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="relative group"
                    style={{
                      userSelect: "none",
                      padding: 4,
                      border: snapshot.isDragging
                        ? "2px solid #0070f3"
                        : "1px solid #ccc",
                      borderRadius: 8,
                      background: "#fff",
                      ...provided.draggableProps.style,
                    }}
                  >
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
                    {renderAction && renderAction(img)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
