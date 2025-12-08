import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";
import { validateImageMeta } from "@/lib/utils/imageMeta";
import { uploadProfileImageWithProgress } from "@/lib/utils/imageUtil";
import type { ImageType } from "@/types/image";

export type UploadProgressHandler = (
  localId: string,
  loaded: number,
  total: number
) => void;

export interface UploadManager {
  abortController?: AbortController;
  onProgress?: UploadProgressHandler;
  cleanup?: () => void;
}

export function createOrGetUploadManager<T>(factory: () => T): T {
  const w = window as any;
  if (w.__profileUploadMgr) return w.__profileUploadMgr as T;
  const mgr = factory();
  w.__profileUploadMgr = mgr;
  return mgr;
}

export function createUploadManager(): UploadManager {
  return {
    abortController: undefined,
    onProgress: undefined,
    cleanup: undefined,
  };
}

export async function uploadWithProgress(
  uploadUrl: string,
  file: File,
  manager: UploadManager,
  localId?: string
): Promise<Response> {
  const controller = new AbortController();
  manager.abortController = controller;

  if (
    typeof XMLHttpRequest !== "undefined" &&
    typeof FormData !== "undefined"
  ) {
    const resp = await new Promise<Response>((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.responseType = "text";
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (evt) => {
          if (
            evt.lengthComputable &&
            typeof manager.onProgress === "function" &&
            localId
          ) {
            manager.onProgress(localId, evt.loaded, evt.total);
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.onload = () => {
          const headers = new Headers();
          headers.set(
            "Content-Type",
            xhr.getResponseHeader("Content-Type") || "text/plain"
          );
          const body = xhr.response ?? "";
          resolve(
            new Response(body, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers,
            })
          );
        };
        manager.abortController = controller;
        controller.signal.addEventListener("abort", () => {
          try {
            xhr.abort();
          } catch {}
        });
        xhr.send(file);
      } catch (e) {
        reject(e as any);
      }
    });
    return resp;
  }

  return fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
    signal: controller.signal,
  });
}

export function persistPendingImageOrderToLocal(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_IMAGES, JSON.stringify(ids));
  } catch {}
}

export function validateBlobSize(
  blob: Blob,
  maxBytes: number
): { ok: true } | { ok: false; reason: string } {
  if (blob.size > maxBytes) {
    return {
      ok: false,
      reason: `Image exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`,
    };
  }
  return { ok: true };
}

export function safeRevokeObjectURL(url?: string | null) {
  try {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  } catch {}
}

export function deriveSafeImageMimeType(
  type: string | null | undefined
): string {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (typeof type === "string" && allowed.includes(type.toLowerCase()))
    return type;
  return "image/jpeg";
}

export async function fetchBlobFromObjectURL(url: string): Promise<Blob> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to read local image (${resp.status})`);
  }
  return resp.blob();
}

export function fileFromBlob(blob: Blob, fileName = "photo.jpg"): File {
  const type = deriveSafeImageMimeType(blob.type);
  return new File([blob], fileName, { type });
}

export interface UploadPendingImagesResultItem {
  index: number;
  id?: string;
  name: string;
  reason: string;
}

export interface UploadPendingImagesResult {
  createdImageIds: string[];
  failedImages: UploadPendingImagesResultItem[];
}

export async function uploadPendingImages(params: {
  pendingImages: ImageType[];
  userId: string;
  onProgress?: UploadProgressHandler;
}): Promise<UploadPendingImagesResult> {
  const { pendingImages, onProgress } = params;

  const createdImageIds: string[] = [];
  const failedImages: UploadPendingImagesResultItem[] = [];

  const mgr = createOrGetUploadManager(createUploadManager);
  if (onProgress) mgr.onProgress = onProgress;

  for (let index = 0; index < pendingImages.length; index++) {
    const img = pendingImages[index];
    try {
      if (!img.url || !img.url.startsWith("blob:")) {
        failedImages.push({
          index,
          id: img.id,
          name: img.fileName || "photo.jpg",
          reason: "Invalid local image URL",
        });
        continue;
      }

      const blob = await fetchBlobFromObjectURL(img.url);

      try {
        const tmpUrl = URL.createObjectURL(blob);
        const meta = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const el = new Image();
            el.onload = () =>
              resolve({
                width: el.naturalWidth || el.width,
                height: el.naturalHeight || el.height,
              });
            el.onerror = () => reject(new Error("Failed to decode image for metadata"));
            el.src = tmpUrl;
          }
        );
        URL.revokeObjectURL(tmpUrl);

        const { ok, reason } = validateImageMeta(meta, {
          minDim: 512,
          minAspect: 0.5,
          maxAspect: 2.0,
        });
        if (!ok) {
          failedImages.push({
            index,
            id: img.id,
            name: img.fileName || "photo.jpg",
            reason: reason || "Image does not meet size requirements",
          });
          safeRevokeObjectURL(img.url);
          continue;
        }
      } catch {
        // continue on guard failure
      }

      const sizeCheck = validateBlobSize(blob, 5 * 1024 * 1024);
      if (!sizeCheck.ok) {
        failedImages.push({
          index,
          id: img.id,
          name: img.fileName || "photo.jpg",
          reason: sizeCheck.reason,
        });
        safeRevokeObjectURL(img.url);
        continue;
      }

      const file = fileFromBlob(blob, img.fileName || "photo.jpg");

      try {
        const result = await uploadProfileImageWithProgress(
          file,
          (loaded, total) => {
            if (typeof mgr.onProgress === "function") {
              try {
                mgr.onProgress(img.id, loaded, total);
              } catch {}
            }
          }
        );
        if (!result?.imageId) {
          failedImages.push({
            index,
            id: img.id,
            name: file.name,
            reason: "No imageId returned",
          });
          continue;
        }
        createdImageIds.push(result.imageId);
        safeRevokeObjectURL(img.url);
      } catch (e: any) {
        const message = e instanceof Error ? e.message : "Upload failed";
        failedImages.push({ index, id: img.id, name: file.name, reason: message });
        continue;
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Unknown image upload error";
      failedImages.push({ index, id: img.id, name: img.fileName || "photo.jpg", reason: message });
    }
  }

  return { createdImageIds, failedImages };
}

export async function persistServerImageOrder(params: {
  userId: string;
  imageIds: string[];
}) {
  const { updateImageOrder } = await import("@/lib/utils/imageUtil");
  const filtered = params.imageIds.filter(
    (id) => typeof id === "string" && !id.startsWith("local-") && id.trim().length > 0
  );
  if (filtered.length > 1) {
    await updateImageOrder({ userId: params.userId, imageIds: filtered });
  }
}

export function summarizeImageUploadErrors(
  failed: { name: string; reason: string }[],
  sampleCount = 3
) {
  if (failed.length === 0) return "";
  const sample = failed
    .slice(0, sampleCount)
    .map((f) => `${f.name}: ${f.reason}`)
    .join("; ");
  const extra = failed.length > sampleCount ? `, and ${failed.length - sampleCount} more` : "";
  return `Some images failed to upload (${failed.length}). ${sample}${extra}`;
}


