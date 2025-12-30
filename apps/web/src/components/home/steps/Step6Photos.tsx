"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import { validateImageMeta } from "@/lib/utils/imageMeta";
import { Pause, Play, X, Info, Camera } from "lucide-react";
import * as imported from "@/components/ImageUploader";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step6Photos(props: {
  userId: string;
  pendingImages: ProfileImageInfo[];
  setPendingImages: (imgs: ProfileImageInfo[]) => void;
  onImagesChanged: (imgs: (string | ProfileImageInfo)[]) => void;
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
        const key = img.storageId;
        if (!next[key]) {
          next[key] = { status: "idle", progress: 0 };
        }
      }
      for (const id of Object.keys(next)) {
        if (!pendingImages.find((p) => p.storageId === id)) {
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
      (img) => img.storageId.startsWith("local-") && img.url?.startsWith("blob:")
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
              [img.storageId]: { status: "uploading", progress: 0 },
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
                  [img.storageId]: {
                    status: loaded < total ? "uploading" : "success",
                    progress:
                      total > 0
                        ? Math.round((loaded / total) * 100)
                        : prev[img.storageId]?.progress || 0,
                  },
                }));
              }
            );
            if (result?.imageId) {
              // Replace local image entry with server image id
              {
                const current: ProfileImageInfo[] = Array.isArray(pendingImages)
                  ? pendingImages
                  : [];
                const next: ProfileImageInfo[] = current.map((p) =>
                  p.storageId === img.storageId
                    ? {
                        ...p,
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
                [img.storageId]: {
                  status: "error",
                  progress: prev[img.storageId]?.progress || 0,
                  error: "No imageId returned",
                },
              }));
            }
          } catch (e: any) {
            setItemState((prev) => ({
              ...prev,
              [img.storageId]: {
                status: "error",
                progress: prev[img.storageId]?.progress || 0,
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

  // Persist order to server once all images are uploaded (no local- ids remain)
  React.useEffect(() => {
    if (!userId) return;
    if (!Array.isArray(pendingImages) || pendingImages.length === 0) return;
    const hasLocal = pendingImages.some((img) => img.storageId.startsWith("local-"));
    if (hasLocal) return;
    const ids = pendingImages
      .map((img) => img.storageId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    let t: any;
    (async () => {
      try {
        const { updateImageOrder } = await import("@/lib/utils/imageUtil");
        // debounce slightly to avoid rapid calls during quick reorders
        t = setTimeout(async () => {
          await updateImageOrder({ userId, imageIds: ids });
        }, 500);
      } catch {}
    })();
    return () => {
      if (t) clearTimeout(t);
    };
  }, [userId, pendingImages]);

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
    async (img: ProfileImageInfo) => {
      setItemState((prev) => ({
        ...prev,
        [img.storageId]: { status: "idle", progress: 0, error: undefined },
      }));
      const nextImages = [...pendingImages];
      onImagesChanged(nextImages);
    },
    [onImagesChanged, pendingImages]
  );

  const [pausedIds, setPausedIds] = React.useState<Record<string, boolean>>({});
  const setPaused = (id: string, val: boolean) =>
    setPausedIds((p) => ({ ...p, [id]: val }));

  const _preflightValidate = React.useCallback(async (img: ProfileImageInfo) => {
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 rounded bg-black/40 text-white hover:bg-black/60 hover:text-white"
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
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 rounded bg-black/40 text-white hover:bg-black/60 hover:text-white"
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
                </Button>
              </div>
            </div>
            <div className="h-1 bg-black/10">
              <div
                className="h-1 bg-primary transition-all"
                style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
              />
            </div>
          </div>
        )}
        {s.status === "error" && (
          <div className="bg-danger/10 p-2">
            <p className="text-xs text-danger truncate">
              {s.error || "Upload failed"}
            </p>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
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
    <div className="space-y-8">
      <div className="bg-primary/5 backdrop-blur-sm rounded-3xl p-8 border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
            <Camera className="w-24 h-24 text-primary" />
        </div>
        
        <div className="relative z-10">
            <h3 className="text-xl font-serif font-bold text-neutral-dark mb-2">Add Your Photos</h3>
            <p className="text-sm text-neutral-light font-sans leading-relaxed max-w-md">
                Profiles with photos get 10x more matches. Add at least one photo to get started.
            </p>
        </div>

        <div className="mt-8">
            {pendingImages.length > 0 && (
            <div className="mb-8">
                <ProfileImageReorder
                preUpload
                images={pendingImages}
                userId={userId || ""}
                loading={false}
                renderAction={(img) => {
                    const state = itemState[img.storageId];
                    if (!state) return null;
                    const base =
                    "text-[10px] rounded-full px-2 py-1 font-bold shadow-sm font-sans uppercase tracking-wider";
                    if (state.status === "uploading")
                    return (
                        <span className={`${base} bg-primary text-white`}>
                        {state.progress}%
                        </span>
                    );
                    if (state.status === "success")
                    return (
                        <span className={`${base} bg-success text-white`}>
                        ✓ Done
                        </span>
                    );
                    if (state.status === "error")
                    return (
                        <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleRetry(img);
                        }}
                        className={`${base} bg-danger text-white hover:bg-danger hover:text-white h-auto p-1 px-2`}
                        >
                        Retry
                        </Button>
                    );
                    return null;
                }}
                onReorder={async (ordered: ProfileImageInfo[]) => {
                    setPendingImages(ordered);
                    try {
                    const ids = ordered.map((img) => img.storageId);
                    const { persistPendingImageOrderToLocal } = await import(
                        "../profileCreation/step6"
                    );
                    persistPendingImageOrderToLocal(ids);
                    } catch {}
                }}
                onOptimisticDelete={(imageId: string) => {
                    const next = pendingImages.filter((im) => im.storageId !== imageId);
                    setPendingImages(next);
                    onImagesChanged(next);
                }}
                onDeleteImage={async (imageId: string) => {
                    const next = pendingImages.filter((im) => im.storageId !== imageId);
                    setPendingImages(next);
                    onImagesChanged(next);
                    try {
                    const ids = next.map((img) => img.storageId);
                    const { persistPendingImageOrderToLocal } = await import(
                        "../profileCreation/step6"
                    );
                    persistPendingImageOrderToLocal(ids);
                    } catch {}
                }}
                />
            </div>
            )}

            <div className="flex justify-center">
            <imported.ImageUploader
                mode="local"
                userId={userId}
                orderedImages={pendingImages}
                setIsUploading={() => {}}
                isUploading={false}
                fetchImages={async () => {}}
                maxFiles={5}
                onOptimisticUpdate={(img: ProfileImageInfo) => {
                try {
                    const next = [...pendingImages, img];
                    setPendingImages(next);
                    onImagesChanged(next);
                } catch {}
                }}
            />
            </div>
        </div>
        
        <div className="mt-8 flex items-start gap-3 text-xs text-neutral-light/80 bg-white/50 rounded-2xl p-4 border border-neutral/10 font-sans">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <span className="leading-relaxed">
            Upload high-quality photos (JPG, PNG, WebP). Maximum 5 images, 5MB each. Minimum 512x512 pixels.
          </span>
        </div>
      </div>
    </div>
  );
}



