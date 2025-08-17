import { postJson } from "@/lib/http/client";
// Firebase Storage migration helpers
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

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
}): Promise<{ ok: true }> {
  // POST new order to server using canonical payload { profileId, imageIds }
  const profileId = args.profileId || args.userId;
  await postJson("/api/profile-images/order", {
    profileId,
    imageIds: args.imageIds,
  });
  return { ok: true };
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

type UploadResult = { imageId: string; url?: string };

async function registerFirebaseImageMetadata(args: {
  storageId: string;
  file: File;
}): Promise<UploadResult> {
  // Call firebase metadata route (JSON branch) which persists to Firestore
  const res = await fetchWithFirebaseAuth("/api/profile-images/firebase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageId: args.storageId,
      fileName: args.file.name,
      contentType: args.file.type,
      size: args.file.size,
    }),
  });
  if (!res.ok) {
    let txt = "";
    try {
      txt = await res.text();
    } catch {}
    throw new Error(txt || "Failed to save image metadata");
  }
  const data = (await res.json().catch(() => ({}))) as {
    imageId?: string;
    url?: string;
    storageId?: string;
  };
  const imageId = data.imageId || data.storageId || args.storageId;
  return { imageId, url: data.url };
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
          resolve({ imageId: meta.imageId, url: meta.url || url });
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
