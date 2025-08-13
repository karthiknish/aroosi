import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "./ClerkAuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X as CloseIcon, Grip } from "lucide-react";
// Use the correct import for the modal
import ImageDeleteConfirmation from "@/components/ImageDeleteConfirmation";
import ProfileImageModal from "@/components/ProfileImageModal";
import type { ImageType } from "@/types/image";
import { updateImageOrder } from "@/lib/utils/imageUtil";

type Props = {
  images: ImageType[];
  userId: string;
  onReorder?: (newOrder: ImageType[]) => void;
  renderAction?: (img: ImageType, idx: number) => React.ReactNode;
  onDeleteImage?: (imageId: string) => void;
  onOptimisticDelete?: (imageId: string) => void;
  isAdmin?: boolean;
  profileId?: string;
  loading?: boolean;
  /**
   * When true, skip server persistence and only invoke onReorder.
   * Use this for pre-upload/local-only ordering (e.g., inside ProfileCreationModal).
   */
  preUpload?: boolean;
};

const SortableImageBase = ({
  img,
  dndId,
  onDeleteImage,
  onOptimisticDelete,
  isDragging = false,
  imageIndex,
  setModalState,
  onSetMain,
}: {
  img: ImageType;
  dndId: string;
  onDeleteImage?: (id: string) => void;
  onOptimisticDelete?: (id: string) => void;
  isDragging?: boolean;
  imageIndex: number;
  setModalState: React.Dispatch<
    React.SetStateAction<{ open: boolean; index: number }>
  >;
  onSetMain?: (dndId: string) => void;
}): React.ReactElement => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndDragging,
  } = useSortable({ id: dndId, resizeObserverConfig: undefined });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || dndDragging ? 0.8 : 1,
    zIndex: isDragging || dndDragging ? 1 : "auto",
    width: "100%",
    height: "100%",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      aria-grabbed={isDragging || dndDragging ? "true" : "false"}
      {...attributes}
      {...listeners}
    >
      <div
        className="absolute -left-2 -top-2 p-2 cursor-grab active:cursor-grabbing z-10 opacity-100 group-hover:opacity-100 transition-opacity"
        role="presentation"
        aria-hidden="true"
      >
        <Grip className="w-4 h-4 text-gray-400" />
      </div>
      {/* Set as main (move to index 0) */}
      {onSetMain && imageIndex !== 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetMain(dndId);
          }}
          className="absolute left-1 bottom-1 bg-white/85 text-gray-800 border border-gray-300 rounded px-1.5 py-0.5 text-[11px] hover:bg-white z-20"
          aria-label="Set as main"
        >
          Set main
        </button>
      )}
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gray-100 rounded-lg" />
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-lg border border-gray-200 gap-2">
          <span className="text-gray-500 text-xs">Failed to load image</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // retry: clear flag and reattempt by swapping src with cache-busting param
              setError(false);
              setLoaded(false);
              try {
                const imgEl = new Image();
                const cacheBust = (url: string) =>
                  url
                    ? url.includes("?")
                      ? `${url}&r=${Date.now()}`
                      : `${url}?r=${Date.now()}`
                    : url;
                imgEl.src = cacheBust(img.url);
              } catch {}
            }}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            Retry
          </button>
          {/* Optional small fallback thumbnail area */}
          <div className="w-10 h-10 bg-gray-200 rounded" aria-hidden="true" />
        </div>
      ) : (
        <button
          type="button"
          className={
            "w-full h-full rounded-lg border border-gray-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 " +
            (loaded ? "opacity-100" : "opacity-0")
          }
          aria-label={`View image ${imageIndex + 1}`}
          onClick={() => setModalState({ open: true, index: imageIndex })}
        >
          <img
            src={img.url}
            alt="Profile"
            loading="lazy"
            className={"w-full h-full object-cover"}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </button>
      )}
      {/* Drag listeners are bound to the handle above */}
      {onDeleteImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirmation(true);
          }}
          className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full p-1.5 text-xs transition-colors z-30 shadow-sm"
          aria-label="Remove image"
          tabIndex={0}
          type="button"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
      {/* Use the correct modal import and props */}
      <ImageDeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={async () => {
          // Optimistic delete: immediately remove from UI
          if (onOptimisticDelete) {
            onOptimisticDelete(img.id);
          }
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
  onOptimisticDelete,
  loading = false,
  preUpload = false,
}: Props) {
  // Cookie-auth: AuthContext no longer exposes token
  useAuthContext();
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Controlled/uncontrolled mode fallback to avoid drift when parent doesn't reconcile promptly.
  // If onReorder is not provided, maintain an internal copy of images for rendering.
  const [internalImages, setInternalImages] = useState<ImageType[] | null>(
    null
  );

  // Keep internal images in sync with prop updates when not actively reordering.
  React.useEffect(() => {
    if (!onReorder) {
      setInternalImages(images);
    }
  }, [images, onReorder]);

  const currentImages: ImageType[] = internalImages ?? images;

  // Keep a snapshot of previous list to avoid stale closures for rollback on server errors
  const prevImagesRef = useRef<ImageType[]>(currentImages);

  React.useEffect(() => {
    prevImagesRef.current = currentImages;
  }, [currentImages]);

  // Modal state for swiping through images
  const [modalState, setModalState] = useState<{
    open: boolean;
    index: number;
  }>({
    open: false,
    index: 0,
  });

  // Accessibility: add KeyboardSensor and improve touch activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor)
  );

  // Track drag start/cancel to render DragOverlay thumbnail
  const handleDragStart = useCallback((evt: DragStartEvent) => {
    if (!evt.active?.id) return;
    setActiveId(String(evt.active.id));
  }, []);
  const handleDragCancel = useCallback(() => setActiveId(null), []);

  // Build a stable dnd-id per image with collision handling
  const dndIds: string[] = useMemo(() => {
    const seen = new Map<string, number>();
    return currentImages.map((img, idx) => {
      // Base id selection order: id -> storageId -> hashed url -> fallback index
      let base = String(img.id ?? "");
      if (!base) base = String(img.storageId ?? "");
      if (!base) {
        try {
          // Deterministic short hash from URL for client-only items
          const url = String(img.url ?? "");
          let h = 0;
          for (let i = 0; i < url.length; i++) {
            h = (h * 31 + url.charCodeAt(i)) | 0;
          }
          base = `tmp-${Math.abs(h)}`;
        } catch {
          base = "";
        }
      }
      if (!base) base = `idx-${idx}`;

      // De-duplicate: append suffix if already seen
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}__${count}`;
    });
  }, [currentImages]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (loading || isReordering) return;
      const { active, over } = event;

      if (!over || !over.id || active.id === over.id) return;

      // Normalize IDs: dnd-kit UniqueIdentifier may be string | number | symbol
      const activeId = String(active.id as UniqueIdentifier);
      const overId = String(over.id as UniqueIdentifier);

      const idxOf = (id: string) => dndIds.findIndex((x) => x === id);

      const oldIndex = idxOf(activeId);
      const newIndex = idxOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrdered = arrayMove(currentImages, oldIndex, newIndex);

      // Optimistic update: immediately update UI
      if (onReorder) {
        onReorder(newOrdered);
      } else {
        setInternalImages(newOrdered);
      }

      // Capture snapshot for potential rollback
      const snapshotForRollback = prevImagesRef.current;

      // Announce for screen readers
      try {
        const msg = `Moved image ${oldIndex + 1} to position ${newIndex + 1}`;
        if (liveRef.current) {
          liveRef.current.textContent = msg;
          // Clear message after a tick to allow subsequent announcements
          setTimeout(() => {
            if (liveRef.current) liveRef.current.textContent = "";
          }, 750);
        }
      } catch {}

      // Pre-upload mode: do not persist to server
      if (preUpload) return;

      // If modal is open, keep it anchored to the same image by id, recompute index
      if (modalState?.open) {
        const anchorId = String(
          currentImages[oldIndex]?.id ??
            currentImages[oldIndex]?.storageId ??
            ""
        );
        const newIdxForAnchor = newOrdered.findIndex(
          (im) => String(im.id ?? im.storageId ?? "") === anchorId
        );
        // Safely update modal index
        setModalState((prev) => ({
          ...prev,
          index: newIdxForAnchor >= 0 ? newIdxForAnchor : 0,
        }));
      }

      try {
        setIsReordering(true);
        setError(null);

        // Enforce storageId-only ordering for server persistence. If any are missing, skip and rollback.
        const storageIds = newOrdered
          .map((img) => img.storageId)
          .filter(
            (sid): sid is string => typeof sid === "string" && sid.length > 0
          );

        if (storageIds.length !== newOrdered.length) {
          showErrorToast(
            null,
            "Cannot update order yet. Some images are still pending upload."
          );
          // Roll back optimistic update since we didn't persist
          if (onReorder) {
            onReorder(snapshotForRollback);
          } else {
            setInternalImages(snapshotForRollback);
          }
          setIsReordering(false);
          return;
        }

        await updateImageOrder({ userId, imageIds: storageIds });

        showSuccessToast("Image order updated successfully");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update image order";
        console.error("Error updating image order:", errorMessage);
        setError(errorMessage);
        showErrorToast(null, `Failed to update order: ${errorMessage}`);

        // Revert optimistic update on error
        if (onReorder) {
          onReorder(snapshotForRollback);
        } else {
          setInternalImages(snapshotForRollback);
        }
      } finally {
        setIsReordering(false);
      }
    },
    [
      loading,
      isReordering,
      currentImages,
      onReorder,
      userId,
      preUpload,
      dndIds,
      modalState?.open,
    ]
  );

  // ARIA live region for announcing reorder
  const liveRef = useRef<HTMLDivElement | null>(null);

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

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">No images to display</div>
    );
  }

  // Prepare images for modal swiping
  const modalImages = images.map((img) => ({
    url: img.url,
    name: "Profile Image",
  }));

  return (
    <div
      className="space-y-2"
      aria-roledescription="sortable"
      aria-label="Reorder profile images"
    >
      {/* Live region for reorder announcements */}
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={dndIds}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-row flex-nowrap gap-4 overflow-x-auto overflow-y-hidden">
            {currentImages.map((img, idx) => {
              const dndId = dndIds[idx] ?? `idx-${idx}`;
              return (
                <div
                  key={dndId}
                  style={{ width: 100, height: 100 }}
                  className="rounded-lg"
                >
                  <div className="w-full h-full rounded-lg">
                    <SortableImageBase
                      img={img}
                      dndId={dndId}
                      onDeleteImage={onDeleteImage}
                      onOptimisticDelete={onOptimisticDelete}
                      imageIndex={idx}
                      setModalState={setModalState}
                      onSetMain={(chosenId: string) => {
                        const from = dndIds.findIndex((x) => x === chosenId);
                        if (from <= 0) return;
                        const reordered = arrayMove(currentImages, from, 0);
                        if (onReorder) {
                          onReorder(reordered);
                        } else {
                          setInternalImages(reordered);
                        }
                        // Persist if not preUpload
                        if (!preUpload) {
                          (async () => {
                            try {
                              const newOrderIds = reordered.map((im) =>
                                im.storageId ? im.storageId : String(im.id)
                              );
                              await updateImageOrder({
                                userId,
                                imageIds: newOrderIds,
                              });
                              showSuccessToast("Set as main");
                            } catch (e) {
                              const msg =
                                e instanceof Error
                                  ? e.message
                                  : "Failed to set main";
                              showErrorToast(null, msg);
                              // rollback
                              if (onReorder) {
                                onReorder(currentImages);
                              } else {
                                setInternalImages(currentImages);
                              }
                            }
                          })();
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag overlay preview to reduce layout jitter */}
        <DragOverlay adjustScale={true} dropAnimation={null}>
          {activeId
            ? (() => {
                const idx = dndIds.findIndex((x) => x === activeId);
                const img = currentImages[idx];
                if (!img) return null;
                return (
                  <div
                    style={{ width: 100, height: 100 }}
                    className="rounded-lg overflow-hidden shadow-lg"
                  >
                    <img
                      src={img.url}
                      alt="Dragging"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })()
            : null}
        </DragOverlay>
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
          <LoadingSpinner size={20} />
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
