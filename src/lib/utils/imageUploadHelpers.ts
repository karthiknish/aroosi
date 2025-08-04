/**
 * Image upload helpers: progress tracking, cancel support, and XHR upload
 * Designed to be framework-agnostic and safe to import in React components.
 *
 * Usage in a component:
 *   const mgr = createUploadManager();
 *   try {
 *     const resp = await uploadWithProgress(uploadUrl, file, mgr, localId);
 *     const json = await resp.json();
 *   } finally {
 *     mgr.cleanup(localId);
 *   }
 */

export type ProgressMap = Record<string, number>;
export type AbortMap = Record<string, AbortController>;

export interface UploadManager {
  progressRef: { current: ProgressMap };
  abortControllersRef: { current: AbortMap };
  setProgress: (id: string, pct: number) => void;
  resetProgress: (id: string) => void;
  cancelUpload: (id: string) => void;
  cleanup: (id?: string) => void;
}

/**
 * Create a new upload manager with isolated refs and helpers.
 */
export function createUploadManager(): UploadManager {
  const progressRef = { current: {} as ProgressMap };
  const abortControllersRef = { current: {} as AbortMap };

  const setProgress = (id: string, pct: number) => {
    progressRef.current[id] = Math.max(0, Math.min(100, Math.round(pct)));
  };

  const resetProgress = (id: string) => {
    delete progressRef.current[id];
  };

  const cancelUpload = (id: string) => {
    const ctrl = abortControllersRef.current[id];
    if (ctrl) {
      try {
        ctrl.abort();
      } catch {
        // ignore
      }
    }
  };

  const cleanup = (id?: string) => {
    if (id) {
      delete abortControllersRef.current[id];
      delete progressRef.current[id];
      return;
    }
    // full cleanup
    for (const k of Object.keys(abortControllersRef.current)) {
      try {
        abortControllersRef.current[k].abort();
      } catch {
        // ignore
      }
    }
    abortControllersRef.current = { current: {} as AbortMap } as any;
    progressRef.current = {};
  };

  return {
    progressRef,
    abortControllersRef,
    setProgress,
    resetProgress,
    cancelUpload,
    cleanup,
  };
}

/**
 * Upload a File to the provided uploadUrl using XMLHttpRequest to capture progress events.
 * Returns a Response-like object with the server response.
 */
export async function uploadWithProgress(
  uploadUrl: string,
  file: File,
  manager: UploadManager,
  id: string
): Promise<Response> {
  const controller = new AbortController();
  manager.abortControllersRef.current[id] = controller;

  return new Promise<Response>((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = (ev.loaded / ev.total) * 100;
          manager.setProgress(id, pct);
        }
      };

      xhr.onload = () => {
        manager.setProgress(id, 100);
        try {
          const status = xhr.status;
          const statusText = xhr.statusText;
          const textBody = xhr.responseText;
          resolve(
            new Response(textBody, {
              status,
              statusText,
              headers: {
                "Content-Type":
                  xhr.getResponseHeader("Content-Type") || "application/json",
              } as any,
            })
          );
        } catch (err) {
          reject(err);
        } finally {
          manager.resetProgress(id);
          delete manager.abortControllersRef.current[id];
        }
      };

      xhr.onerror = () => {
        manager.resetProgress(id);
        delete manager.abortControllersRef.current[id];
        reject(new Error("Network error during image upload"));
      };

      xhr.onabort = () => {
        manager.resetProgress(id);
        delete manager.abortControllersRef.current[id];
        reject(new Error("Upload canceled by user"));
      };

      // Wire AbortController to XHR
      controller.signal.addEventListener("abort", () => {
        try {
          xhr.abort();
        } catch {
          // ignore
        }
      });

      xhr.send(file);
    } catch (e) {
      manager.resetProgress(id);
      delete manager.abortControllersRef.current[id];
      reject(e);
    }
  });
}

/**
 * Convenience guard: validate a Blob size against max bytes.
 */
export function ensureMaxSize(blob: Blob, maxBytes: number): { ok: true } | { ok: false; reason: string } {
  if (blob.size > maxBytes) {
    return { ok: false, reason: `Image exceeds ${Math.floor(maxBytes / (1024 * 1024))}MB` };
  }
  return { ok: true };
}

/**
 * Additional helpers: file hashing for duplicate detection and UI filename sanitize.
 * Appended non-breaking exports for use by LocalImageUpload and ProfileCreationModal.
 */

/**
 * Compute a stable session hash for a file using SHA-256 over a small prefix + size.
 * Uses first 256KB to keep it fast, plus total size to reduce collisions.
 */
export async function computeFileHash(file: File): Promise<string> {
  const prefixSize = Math.min(file.size, 256 * 1024); // 256KB
  const slice = file.slice(0, prefixSize);
  const buf = await slice.arrayBuffer();
  const sizeBytes = new TextEncoder().encode(String(file.size));
  const combined = new Uint8Array(buf.byteLength + sizeBytes.byteLength);
  combined.set(new Uint8Array(buf), 0);
  combined.set(sizeBytes, buf.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hashHex}:${file.size}`;
}

/**
 * Sanitize a filename for UI display only. Do not mutate underlying filename used for upload.
 * - Removes control characters
 * - Collapses whitespace
 * - Restricts to visible unicode letters/numbers/punctuation/space
 * - Truncates to a reasonable length while preserving extension where possible
 */
export function sanitizeDisplayName(name: string): string {
  try {
    const withoutControls = name.replace(/[\u0000-\u001F\u007F]/g, "");
    const collapsed = withoutControls.replace(/\s+/g, " ").trim();
    // Fallback-safe allowlist for ES5 targets: keep common filename-safe chars
    // Letters, numbers, spaces, dot, underscore, hyphen, parentheses
    const visibleOnly = collapsed.replace(/[^A-Za-z0-9 ._\-()]/g, "");
    const MAX = 80;
    if (visibleOnly.length <= MAX) return visibleOnly;

    const dot = visibleOnly.lastIndexOf(".");
    if (dot > 0 && dot < visibleOnly.length - 1) {
      const base = visibleOnly.slice(0, dot);
      const ext = visibleOnly.slice(dot);
      const headLen = Math.max(0, MAX - ext.length - 3);
      return `${base.slice(0, headLen)}...${ext}`;
    }
    return `${visibleOnly.slice(0, MAX - 3)}...`;
  } catch {
    return name;
  }
}

/**
 * In-memory wrapper over sessionStorage to track duplicate file hashes for this session.
 */
export const DuplicateSession = {
  key: "profile_upload_hashes_v1",
  getSet(): Set<string> {
    try {
      const raw = sessionStorage.getItem(this.key);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  },
  has(hash: string): boolean {
    return this.getSet().has(hash);
  },
  add(hash: string): void {
    const s = this.getSet();
    s.add(hash);
    try {
      sessionStorage.setItem(this.key, JSON.stringify(Array.from(s)));
    } catch {
      // ignore quota/security errors
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  },
};
