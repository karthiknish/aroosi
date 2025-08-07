import { getJson, postJson, putJson } from "@/lib/http/client";

/**
 * Image utilities using the centralized HTTP client.
 * No token parameters are accepted; Authorization is auto-attached via tokenStorage.
 */

// Deprecated: switched to single local multipart endpoint
export async function getImageUploadUrl(): Promise<string> {
  throw new Error(
    "Deprecated: use /api/profile-images/upload with multipart FormData"
  );
}

export async function saveImageMeta(_: any): Promise<{ imageId: string }> {
  throw new Error(
    "Deprecated: metadata saved server-side in /api/profile-images/upload"
  );
}

export async function updateImageOrder(args: {
  userId: string;
  imageIds: string[];
}): Promise<{ ok: true }> {
  // PUT new order to server
  // Endpoint present at: /api/profile-images/order
  await putJson("/api/profile-images/order", {
    userId: args.userId,
    imageIds: args.imageIds,
  });
  return { ok: true };
}

// Provide an object wrapper to ease spying in tests without redefining the function
export const imageApi = {
  updateImageOrder,
};

export async function uploadProfileImage(
  file: File
): Promise<{ imageId: string; url?: string }> {
  const form = new FormData();
  form.append("image", file, file.name);
  const resp = await fetch("/api/profile-images/upload", {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || "Failed to upload image");
  }
  const json = (await resp.json().catch(() => ({}))) as {
    imageId?: string;
    url?: string;
  };
  if (!json.imageId) throw new Error("Upload response missing imageId");
  return { imageId: json.imageId, url: json.url };
}

export function uploadProfileImageWithProgress(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ imageId: string; url?: string }> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/profile-images/upload", true);
      xhr.responseType = "json";
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && typeof onProgress === "function") {
          onProgress(evt.loaded, evt.total);
        }
      };
      xhr.onload = () => {
        const status = xhr.status;
        if (status >= 200 && status < 300) {
          const data = (xhr.response || {}) as {
            imageId?: string;
            url?: string;
          };
          if (!data.imageId) {
            reject(new Error("Upload response missing imageId"));
            return;
          }
          resolve({ imageId: data.imageId, url: data.url });
        } else {
          const body =
            typeof xhr.responseText === "string" ? xhr.responseText : "";
          reject(new Error(body || `Upload failed (${status})`));
        }
      };
      xhr.onerror = () =>
        reject(new Error("Network error during image upload"));
      const form = new FormData();
      form.append("image", file, file.name);
      xhr.send(form);
    } catch (e) {
      reject(e);
    }
  });
}

export function uploadProfileImageWithProgressCancellable(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): { promise: Promise<{ imageId: string; url?: string }>; cancel: () => void } {
  let xhr: XMLHttpRequest | null = null;
  const promise = new Promise<{ imageId: string; url?: string }>((resolve, reject) => {
    try {
      xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/profile-images/upload", true);
      xhr.responseType = "json";
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && typeof onProgress === "function") {
          onProgress(evt.loaded, evt.total);
        }
      };
      xhr.onload = () => {
        const status = xhr!.status;
        if (status >= 200 && status < 300) {
          const data = (xhr!.response || {}) as { imageId?: string; url?: string };
          if (!data.imageId) {
            reject(new Error("Upload response missing imageId"));
            return;
          }
          resolve({ imageId: data.imageId, url: data.url });
        } else {
          const body = typeof xhr!.responseText === "string" ? xhr!.responseText : "";
          reject(new Error(body || `Upload failed (${status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during image upload"));
      const form = new FormData();
      form.append("image", file, file.name);
      xhr.send(form);
    } catch (e) {
      reject(e);
    }
  });
  const cancel = () => {
    try {
      xhr?.abort();
    } catch {
      // ignore
    }
  };
  return { promise, cancel };
}
