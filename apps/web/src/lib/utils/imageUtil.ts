import { postJson } from "@/lib/http/client";
import { putJson } from "@/lib/http/client";
// Firebase Storage migration helpers
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import type { ProfileImageInfo } from "@aroosi/shared/types";

/**
 * Image utilities using the centralized HTTP client.
 * No token parameters are accepted; Authorization is auto-attached via tokenStorage.
 */

// (All prior two-step upload helpers removed; use uploadProfileImage or
// uploadProfileImageWithProgress which call the canonical multipart endpoint.)

export async function updateImageOrder(args: {
  profileId?: string;
  userId?: string; // backward-compat: will be mapped to profileId
  imageIds: string[];
  skipUrlReorder?: boolean;
  rebuildUrls?: boolean;
}): Promise<{ ok: true; correlationId?: string } | never> {
  const profileId = args.profileId || args.userId;
  try {
    const res = await postJson<{
      success?: boolean;
      correlationId?: string;
      code?: string;
      invalidIds?: string[];
      error?: string;
    }>("/api/profile-images/order", {
      profileId,
      imageIds: args.imageIds,
      skipUrlReorder: args.skipUrlReorder,
      rebuildUrls: args.rebuildUrls,
    });
    return { ok: true, correlationId: res?.correlationId };
  } catch (e: any) {
    // Map specific 422 invalid image ids to a cleaner message
    const raw = e?.message || "";
    if (/(422|INVALID_IMAGE_IDS)/.test(raw)) {
      const err = new Error(
        "Some photos are still processing or failed to upload. Wait for uploads to finish, then try again."
      );
      (err as any).code = "INVALID_IMAGE_IDS";
      throw err;
    }
    throw e;
  }
}

// Provide an object wrapper to ease spying in tests without redefining the function
export const imageApi = {
  updateImageOrder,
};

const USE_FIREBASE_STORAGE =
  process.env.NEXT_PUBLIC_USE_FIREBASE_STORAGE === "true";

// Common validation aligned with server rules
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type UploadResult = ProfileImageInfo & { imageId: string };

async function registerFirebaseImageMetadata(args: {
  storageId: string;
  file: File;
}): Promise<UploadResult> {
  // (debug logs removed)

  // Call firebase metadata route (JSON branch) which persists to Firestore
  const res = await fetch("/api/profile-images/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageId: args.storageId,
      fileName: args.file.name,
      contentType: args.file.type,
      size: args.file.size,
    }),
    credentials: "include",
  });

  // (debug logs removed)
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as any;
    throw new Error(
      String(json?.message || json?.error || "Failed to save image metadata")
    );
  }
  const json = (await res.json().catch(() => ({}))) as any;
  const data = (json?.data ?? json) as any;
  const imageId = data?.imageId || data?.storageId || args.storageId;
  return { 
    ...data,
    imageId, 
    storageId: args.storageId,
    url: data?.url
  };
}

async function uploadViaFirebaseStorage(
  file: File,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported image type");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File too large (max 5MB)");
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `users/${user.uid}/profile-images/${Date.now()}_${uuidv4()}.${ext}`;
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: user.uid,
      originalName: file.name,
    },
  } as any;
  const task = uploadBytesResumable(storageRef, file, metadata);

  return await new Promise<UploadResult>((resolve, reject) => {
    if (signal) {
      if (signal.aborted) {
        task.cancel();
        return reject(new Error("Upload aborted"));
      }
      signal.addEventListener("abort", () => {
        try {
          task.cancel();
        } catch {}
        reject(new Error("Upload aborted"));
      });
    }
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) onProgress(snap.bytesTransferred, snap.totalBytes);
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref).catch(
            () => undefined
          );
          const meta = await registerFirebaseImageMetadata({
            storageId: path,
            file,
          });
          // prefer metadata url if provided
          resolve({ 
            ...meta,
            url: meta.url || url || "",
            storageId: path,
            fileName: file.name,
            size: file.size,
            contentType: file.type,
            uploadedAt: new Date().toISOString()
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

export async function uploadProfileImage(file: File): Promise<UploadResult> {
  return uploadViaFirebaseStorage(file);
}

export function uploadProfileImageWithProgress(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<UploadResult> {
  return uploadViaFirebaseStorage(file, onProgress);
}

export function uploadProfileImageWithProgressCancellable(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): { promise: Promise<UploadResult>; cancel: () => void } {
  if (USE_FIREBASE_STORAGE) {
    const controller = new AbortController();
    const promise = uploadViaFirebaseStorage(
      file,
      onProgress,
      controller.signal
    );
    const cancel = () => controller.abort();
    return { promise, cancel };
  }
  const controller = new AbortController();
  const promise = uploadViaFirebaseStorage(file, onProgress, controller.signal);
  const cancel = () => controller.abort();
  return { promise, cancel };
}

/**
 * Promote an image to be the main image (first in order) for the current user
 */
export async function setMainProfileImage(imageId: string): Promise<void> {
  await putJson("/api/profile-images/main", { imageId });
}

// ------------------------------------------------------------
// Image list & delete utilities (server-backed)
// ------------------------------------------------------------

/**
 * Fetch the authenticated user's profile images from the server.
 * Uses cookie session via `credentials: "include"`.
 */
export async function fetchProfileImages(
  userId?: string
): Promise<ProfileImageInfo[]> {
  const url = userId
    ? `/api/profile-images/firebase?userId=${encodeURIComponent(userId)}`
    : "/api/profile-images/firebase";
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  const json = (await res.json().catch(() => ({}))) as any;
  const images = (json?.data?.images ?? json?.images ?? []) as ProfileImageInfo[];
  return Array.isArray(images) ? images : [];
}

/**
 * Delete an image by its storageId for the authenticated user.
 */
export async function deleteImageById(storageId: string): Promise<void> {
  const url = `/api/profile-images/firebase?storageId=${encodeURIComponent(
    storageId
  )}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
}
