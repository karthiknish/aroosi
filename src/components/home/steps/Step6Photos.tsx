"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import type { ImageType } from "@/types/image";
import { validateImageMeta } from "@/lib/utils/imageMeta";
import { Pause, Play, X } from "lucide-react";
import * as imported from "@/components/ImageUploader";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step6Photos(props: {
  userId: string;
  pendingImages: ImageType[];
  setPendingImages: (imgs: ImageType[]) => void;
  onImagesChanged: (imgs: (string | ImageType)[]) => void;
}) {
  const { userId, pendingImages, setPendingImages, onImagesChanged } = props;

  const [itemState, setItemState] = React.useState<
    Record<
      string,
      {
        status: "idle" | "uploading" | "success" | "error";
        progress: number;
        error?: string;
      }
    >
  >({});

  React.useEffect(() => {
    if (!Array.isArray(pendingImages)) return;
    setItemState((prev) => {
      const next = { ...prev } as typeof prev;
      for (const img of pendingImages) {
        if (!next[img.id]) {
          next[img.id] = { status: "idle", progress: 0 };
        }
      }
      for (const id of Object.keys(next)) {
        if (!pendingImages.find((p) => p.id === id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [pendingImages]);

  // Auto-upload any "local-" pending images once we have a real userId (after auth completed)
  // to avoid losing them if user navigates away before final submission (step 7).
  React.useEffect(() => {
    // Only proceed if authenticated (userId present) and we have local images.
    if (!userId) return;
    const localImages = pendingImages.filter(
      (img) => img.id.startsWith("local-") && img.url?.startsWith("blob:")
    );
    if (localImages.length === 0) return;
    let canceled = false;
    (async () => {
      try {
        // Dynamically import uploader to avoid circular deps.
        const { uploadProfileImageWithProgress } = await import(
          "@/lib/utils/imageUtil"
        );
        for (const img of localImages) {
          if (canceled) break;
          try {
            setItemState((prev) => ({
              ...prev,
              [img.id]: { status: "uploading", progress: 0 },
            }));
            const blob = await fetch(img.url!).then((r) => r.blob());
            const file = new File([blob], img.fileName || "photo.jpg", {
              type: blob.type || "image/jpeg",
            });
            const result = await uploadProfileImageWithProgress(
              file,
              (loaded, total) => {
                setItemState((prev) => ({
                  ...prev,
                  [img.id]: {
                    status: loaded < total ? "uploading" : "success",
                    progress:
                      total > 0
                        ? Math.round((loaded / total) * 100)
                        : prev[img.id]?.progress || 0,
                  },
                }));
              }
            );
            if (result?.imageId) {
              // Replace local image entry with server image id
              {
                const current: ImageType[] = Array.isArray(pendingImages)
                  ? pendingImages
                  : [];
                const next: ImageType[] = current.map((p: ImageType) =>
                  p.id === img.id
                    ? {
                        ...p,
                        id: result.imageId!,
                        storageId: result.imageId!,
                        url: result.url || p.url,
                      }
                    : p
                );
                setPendingImages(next);
                try {
                  onImagesChanged(next);
                } catch {}
              }
            } else {
              setItemState((prev) => ({
                ...prev,
                [img.id]: {
                  status: "error",
                  progress: prev[img.id]?.progress || 0,
                  error: "No imageId returned",
                },
              }));
            }
          } catch (e: any) {
            setItemState((prev) => ({
              ...prev,
              [img.id]: {
                status: "error",
                progress: prev[img.id]?.progress || 0,
                error: e?.message || "Upload failed",
              },
            }));
          }
        }
      } catch {}
    })();
    return () => {
      canceled = true;
    };
  }, [userId, pendingImages, setPendingImages, onImagesChanged]);

  const subscribeProgress = React.useCallback(async () => {
    try {
      const { createOrGetUploadManager, createUploadManager } = await import(
        "../profileCreation/step6"
      );
      const mgr = createOrGetUploadManager(createUploadManager);
      if (mgr && typeof mgr.onProgress === "function") {
        const handler3 = (fileId: string, loaded: number, total: number) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          setItemState((prev) => {
            if (!prev[fileId]) return prev;
            const nextProgress = Math.max(0, Math.min(100, percent));
            const nextStatus =
              nextProgress > 0 && nextProgress < 100
                ? "uploading"
                : nextProgress === 100
                  ? "success"
                  : prev[fileId].status;
            return {
              ...prev,
              [fileId]: {
                ...prev[fileId],
                status: nextStatus as
                  | "idle"
                  | "uploading"
                  | "success"
                  | "error",
                progress: nextProgress,
              },
            };
          });
        };
        try {
          // @ts-expect-error external manager typing
          mgr.onProgress((fileId: string, loaded: number, total: number) =>
            handler3(fileId, loaded, total)
          );
        } catch {}
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    void subscribeProgress();
  }, [subscribeProgress]);

  const handleRetry = React.useCallback(
    async (img: ImageType) => {
      setItemState((prev) => ({
        ...prev,
        [img.id]: { status: "idle", progress: 0, error: undefined },
      }));
      const nextImages = [...pendingImages];
      onImagesChanged(nextImages);
    },
    [onImagesChanged, pendingImages]
  );

  const [pausedIds, setPausedIds] = React.useState<Record<string, boolean>>({});
  const setPaused = (id: string, val: boolean) =>
    setPausedIds((p) => ({ ...p, [id]: val }));

  const _preflightValidate = React.useCallback(async (img: ImageType) => {
    try {
      if (!img?.url || !img.url.startsWith("blob:")) {
        return { ok: false, reason: "Invalid local image URL" };
      }
      const meta = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const imgEl = new Image();
          imgEl.onload = () =>
            resolve({
              width: imgEl.naturalWidth || imgEl.width,
              height: imgEl.naturalHeight || imgEl.height,
            });
          imgEl.onerror = () =>
            reject(new Error("Failed to decode image for metadata"));
          imgEl.src = img.url;
        }
      );
      const { ok, reason } = validateImageMeta(meta, {
        minDim: 512,
        minAspect: 0.5,
        maxAspect: 2.0,
      });
      return { ok, reason };
    } catch {
      return { ok: true };
    }
  }, []);

  const renderTileOverlay = (
    s: {
      status: "idle" | "uploading" | "success" | "error";
      progress: number;
      error?: string;
    },
    onRetry: () => void,
    id?: string
  ) => {
    return (
      <div className="absolute inset-0 flex flex-col justify-end">
        {s.status === "uploading" && (
          <div className="w-full">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-white/90 bg-black/40 rounded px-1 py-0.5">
                {Math.max(0, Math.min(100, s.progress))}%
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-1 rounded bg-black/40 text-white hover:bg-black/60"
                  aria-label={pausedIds[id || ""] ? "Resume" : "Pause"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaused(id || "", !pausedIds[id || ""]);
                  }}
                >
                  {pausedIds[id || ""] ? (
                    <Play className="w-3 h-3" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                </button>
                <button
                  type="button"
                  className="p-1 rounded bg-black/40 text-white hover:bg-black/60"
                  aria-label="Cancel upload"
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemState((prev) => ({
                      ...prev,
                      [id || ""]: {
                        status: "error",
                        progress: s.progress,
                        error: "Canceled",
                      },
                    }));
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="h-1 bg-black/10">
              <div
                className="h-1 bg-pink-600 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
              />
            </div>
          </div>
        )}
        {s.status === "error" && (
          <div className="bg-red-50/90 p-2">
            <p className="text-xs text-red-600 truncate">
              {s.error || "Upload failed"}
            </p>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={onRetry}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Profile Photos</h3>
        <p className="text-sm text-gray-600">
          Add photos to your profile (optional)
        </p>
      </div>
      <div className="mb-6">
        <Label className="text-gray-700 mb-2 block">Profile Photos</Label>
        {pendingImages.length > 0 && (
          <div className="mt-2">
            {/* Reorder strip (placed above uploader). Also provides delete X on each image. */}
            <ProfileImageReorder
              preUpload
              images={pendingImages as ImageType[]}
              userId={userId || ""}
              loading={false}
              renderAction={(img) => {
                const state = itemState[img.id];
                if (!state) return null;
                const base =
                  "text-[10px] rounded px-1.5 py-0.5 font-medium shadow-sm";
                if (state.status === "uploading")
                  return (
                    <span className={`${base} bg-pink-600 text-white`}>
                      {state.progress}%
                    </span>
                  );
                if (state.status === "success")
                  return (
                    <span className={`${base} bg-emerald-600 text-white`}>
                      Uploaded
                    </span>
                  );
                if (state.status === "error")
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRetry(img);
                      }}
                      className={`${base} bg-red-600 text-white hover:bg-red-700`}
                    >
                      Retry
                    </button>
                  );
                return null;
              }}
              onReorder={async (ordered: ImageType[]) => {
                setPendingImages(ordered);
                try {
                  const ids = ordered.map((img) => img.id);
                  const { persistPendingImageOrderToLocal } = await import(
                    "../profileCreation/step6"
                  );
                  persistPendingImageOrderToLocal(ids);
                } catch {}
              }}
              onOptimisticDelete={(imageId: string) => {
                const next = pendingImages.filter((im) => im.id !== imageId);
                setPendingImages(next);
                onImagesChanged(next);
              }}
              onDeleteImage={async (imageId: string) => {
                // No server persistence in pre-upload mode; ensure local state is clean
                const next = pendingImages.filter((im) => im.id !== imageId);
                setPendingImages(next);
                onImagesChanged(next);
                try {
                  const ids = next.map((img) => img.id);
                  const { persistPendingImageOrderToLocal } = await import(
                    "../profileCreation/step6"
                  );
                  persistPendingImageOrderToLocal(ids);
                } catch {}
              }}
            />
          </div>
        )}

        <div className="mt-4">
          <imported.ImageUploader
            mode="local"
            userId={userId}
            orderedImages={pendingImages as ImageType[]}
            setIsUploading={() => {}}
            isUploading={false}
            fetchImages={async () => {}}
            maxFiles={5}
            onOptimisticUpdate={(img: ImageType) => {
              try {
                const next = [...pendingImages, img];
                setPendingImages(next);
                onImagesChanged(next);
              } catch {}
            }}
          />
          <p className="mt-2 text-xs text-gray-500">
            Max 5 images. JPG, PNG, WebP up to 5MB, minimum 512x512.
          </p>
        </div>
      </div>
    </div>
  );
}



