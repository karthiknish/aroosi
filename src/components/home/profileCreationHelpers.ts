/**
 * Helpers extracted from ProfileCreationModal to centralize side-effectful calls
 * and keep the component lean/testable.
 */
import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";
import { saveImageMeta, updateImageOrder, getImageUploadUrl } from "@/lib/utils/imageUtil";
import { validateImageMeta } from "@/lib/utils/imageMeta";
import type { ImageType } from "@/types/image";

/* ======================
 * Upload manager accessor
 * ====================== */

/**
 * Returns a stable, memoized upload manager stored on window to manage progress/cancel.
 * The manager is created lazily via the provided factory.
 */
export function createOrGetUploadManager<T>(factory: () => T): T {
  const w = window as any;
  if (w.__profileUploadMgr) return w.__profileUploadMgr as T;
  const mgr = factory();
  w.__profileUploadMgr = mgr;
  return mgr;
}

/**
 * Minimal UploadManager type used by uploadWithProgress. Concrete manager may
 * implement progress dispatching, cancellation per image, and cleanup().
 *
 * onProgress signature
 * --------------------
 * We codify the progress callback as a three-argument function:
 *   (localId: string, loaded: number, total: number) => void
 *
 * - localId: A stable identifier for the file within the current session/UI.
 * - loaded:  Bytes uploaded so far, sourced from ProgressEvent.loaded.
 * - total:   Total bytes to upload, sourced from ProgressEvent.total.
 *
 * This mirrors the typical XMLHttpRequestUpload "progress" shape and avoids
 * ad-hoc per-component typings. If a concrete UploadManager needs a different
 * shape internally (e.g., a single object argument), it should adapt to this
 * exported type at the boundary for consistency across components.
 */
export type UploadProgressHandler = (
  localId: string,
  loaded: number,
  total: number
) => void;

export interface UploadManager {
  abortController?: AbortController;
  // Progress callback following UploadProgressHandler signature above
  onProgress?: UploadProgressHandler;
  // Optional cleanup to clear any observers
  cleanup?: () => void;
}

/**
 * Factory to create an UploadManager instance.
 * Kept simple: one AbortController reused per upload call; callers may
 * replace with a richer implementation if needed.
 */
export function createUploadManager(): UploadManager {
  return {
    abortController: undefined,
    onProgress: undefined,
    cleanup: undefined,
  };
}

/**
 * Upload a file to a pre-signed URL with progress, using the provided manager.
 * Returns the raw Response so callers can parse JSON or read text.
 */
export async function uploadWithProgress(
  uploadUrl: string,
  file: File,
  manager: UploadManager,
  localId?: string
): Promise<Response> {
  // Use fetch with AbortController; progress requires XHR. If you need granular progress,
  // replace with XHR implementation. Here we keep fetch for simplicity and portability.
  const controller = new AbortController();
  manager.abortController = controller;

  // If progress is required, use XHR path:
  if (
    typeof XMLHttpRequest !== "undefined" &&
    typeof FormData !== "undefined"
  ) {
    const resp = await new Promise<Response>((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.responseType = "text";
        // Content-Type must match the file.type for signed URLs
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (evt) => {
          if (
            evt.lengthComputable &&
            typeof manager.onProgress === "function" &&
            localId
          ) {
            // Strictly adhere to documented signature (localId, loaded, total)
            manager.onProgress(localId, evt.loaded, evt.total);
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.onload = () => {
          // Construct a fetch-like Response object
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
        // Wire abort
        manager.abortController = controller;
        controller.signal.addEventListener("abort", () => {
          try {
            xhr.abort();
          } catch {}
        });

        xhr.send(file);
      } catch (e) {
        reject(e);
      }
    });
    return resp;
  }

  // Fallback to fetch without progress
  return fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
    signal: controller.signal,
  });
}

/* ======================
 * Required fields helpers
 * ====================== */

/**
 * Global required fields for final submission
 */
export function getGlobalRequiredFields(): string[] {
  return [
    "fullName",
    "dateOfBirth",
    "gender",
    "preferredGender",
    "city",
    "aboutMe",
    "occupation",
    "education",
    "height",
    "maritalStatus",
    "phoneNumber",
  ];
}

/**
 * Step-specific required field mapping.
 * Expand when step forms evolve.
 */
export function getRequiredFieldsForStep(step: number): string[] {
  switch (step) {
    case 2:
      return ["city", "height", "maritalStatus"];
    case 4:
      return ["education", "occupation", "aboutMe"];
    case 5:
      return ["preferredGender"];
    default:
      return [];
  }
}

/* ======================
 * Step navigation / flow helpers (C)
 * ====================== */

/**
 * Clamp and compute next step given current step and whether basic data exists.
 * - totalSteps represents visual progress bar slices; actionable steps end at 7.
 */
export function computeNextStep(params: {
  step: number;
  hasBasicData: boolean;
  direction: "next" | "back";
  min?: number;
  max?: number;
}) {
  const { step, hasBasicData, direction } = params;
  const min = params.min ?? 1;
  const max = params.max ?? 7;
  if (!Number.isFinite(step)) return hasBasicData ? 2 : 1;
  let s = Math.floor(step);
  if (direction === "next") {
    if (hasBasicData && s === 1) s = 2;
    else s = Math.min(max, s + 1);
  } else {
    s = Math.max(min, s - 1);
  }
  return s;
}

/**
 * Normalize initial step on open:
 * - if hasBasicData from Hero, always show Location step (2)
 * - else start at step 1
 */
export function normalizeStartStep(hasBasicData: boolean) {
  return hasBasicData ? 2 : 1;
}

/* ======================
 * Submission orchestration (D)
 * ====================== */

export interface RequiredFieldCheck {
  required: string[];
  missing: string[];
}

/**
 * Determine required fields and which ones are missing from a record
 */
export function computeMissingRequiredFields(
  data: Record<string, unknown>,
  required: string[]
): RequiredFieldCheck {
  const missing = required.filter((k) => {
    const v = (data as any)[k];
    return (
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0)
    );
  });
  return { required, missing };
}

/**
 * Build Profile payload from cleaned data and known mappings
 */
export function buildProfilePayload(
  cleanedData: Record<string, unknown>,
  normalizedPhone?: string
): Partial<import("@/types/profile").ProfileFormValues> {
  return {
    ...(cleanedData as unknown as import("@/types/profile").ProfileFormValues),
    profileFor: (cleanedData.profileFor ?? "self") as
      | "self"
      | "friend"
      | "family",
    dateOfBirth: String(cleanedData.dateOfBirth ?? ""),
    partnerPreferenceCity: Array.isArray(cleanedData.partnerPreferenceCity)
      ? (cleanedData.partnerPreferenceCity as string[])
      : [],
    email: (cleanedData.email as string) || "",
    phoneNumber: normalizedPhone,
  };
}

/**
 * Safe router push with fallback to window.location
 */
export function safeNavigate(
  router: { push: (p: string) => void },
  href: string
) {
  try {
    router.push(href);
  } catch (e) {
    console.error("Navigation error, using window.location:", e);
    if (typeof window !== "undefined") window.location.href = href;
  }
}

/* ======================
 * Validation / Normalization
 * ====================== */

/**
 * Format height strings to normalized display/store variants
 * - input could be "170", "170 cm", or already formatted
 */
export function normalizeHeightInput(height: unknown): string {
  if (typeof height !== "string") return String(height ?? "");
  const raw = height.trim();
  if (/^\d{2,3}$/.test(raw)) return `${raw} cm`;
  return raw;
}

/**
 * Normalize step data snapshot (non-mutating)
 */
export function normalizeStepData(step: number, data: Record<string, unknown>) {
  if (step === 2) {
    const height = data.height;
    const normalizedHeight =
      typeof height === "string" && /^\d{2,3}$/.test(height.trim())
        ? `${height.trim()} cm`
        : height;
    const city = data.city;
    const trimmedCity = typeof city === "string" ? city.trim() : city;
    return { ...data, height: normalizedHeight, city: trimmedCity };
  }
  return { ...data };
}

/**
 * Parse comma separated city list -> string[] trimmed
 */
export function parsePreferredCities(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Filter an object, dropping null/undefined/empty-string/empty-array values
 */
export function filterEmptyValues<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keep =
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === "") &&
      !(Array.isArray(v) && v.length === 0);
    if (keep) (result as any)[k] = v;
  }
  return result;
}

/**
 * Normalize phone number to naive E.164-like (+digits) if possible. Otherwise return original string.
 */
export function normalizePhoneE164Like(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * Price formatting helper for minor units and currency (defaults to GBP)
 */
export function formatMinorUnitPrice(
  minor: number,
  currency: string = "GBP",
  locale?: string
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    // Fallback
    return `£${(minor / 100).toFixed(2)}`;
  }
}

/**
 * Focus first error field using a preferred order; falls back to first reported error
 */
export function focusFirstErrorField(
  getFieldError: (field: string) => string | undefined,
  preferredOrder: string[]
) {
  for (const field of preferredOrder) {
    const err = getFieldError(field);
    if (err) {
      const el = document.getElementById(field);
      if (el) {
        (el as HTMLElement).focus();
        return field;
      }
    }
  }
  // fallback: scan DOM for any [aria-invalid="true"]
  const anyInvalid = document.querySelector(
    '[aria-invalid="true"]'
  ) as HTMLElement | null;
  if (anyInvalid) anyInvalid.focus();
  return undefined;
}

/* ======================
 * Local persistence for pre-upload images
 * ====================== */

/**
 * Persist the locally reordered pending image ids into localStorage.
 * Used in pre-upload mode.
 */
export function persistPendingImageOrderToLocal(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_IMAGES, JSON.stringify(ids));
  } catch {
    // ignore storage issues
  }
}

/* ======================
 * Server persistence for final order
 * ====================== */

/**
 * After images are uploaded and server returns image ids, persist the order server-side.
 * Filters out local placeholders defensively.
 */
export async function persistServerImageOrder(params: {
  userId: string;
  imageIds: string[];
}) {
  const { userId, imageIds } = params;
  const filtered = imageIds.filter(
    (id) =>
      typeof id === "string" && !id.startsWith("local-") && id.trim().length > 0
  );
  if (filtered.length > 1) {
    // Centralized client auto-attaches Authorization; no token bridging necessary.
    await updateImageOrder({ userId, imageIds: filtered });
  }
}

/* ======================
 * Image upload orchestration
 * ====================== */

/**
 * Create upload URL for a new image.
 */
export async function requestImageUploadUrl(): Promise<string> {
  const url = await getImageUploadUrl();
  if (!url) throw new Error("Failed to get upload URL");
  return url;
}

/**
 * Confirm image metadata after successful binary upload.
 */
export async function confirmImageMetadata(args: {
  userId: string;
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}) {
  return saveImageMeta(args);
}

/**
 * Guard: ensure blob is within size limit and return either ok or error reason
 */
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

/**
 * Try to revoke an object URL and swallow errors
 */
export function safeRevokeObjectURL(url?: string | null) {
  try {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  } catch {
    // swallow
  }
}

/**
 * Derive a safe file type from a blob (fallback to image/jpeg)
 */
export function deriveSafeImageMimeType(
  type: string | null | undefined
): string {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (typeof type === "string" && allowed.includes(type.toLowerCase()))
    return type;
  return "image/jpeg";
}

/**
 * Fetch a Blob from a blob: URL with error handling
 */
export async function fetchBlobFromObjectURL(url: string): Promise<Blob> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to read local image (${resp.status})`);
  }
  return resp.blob();
}

/**
 * Create a File from a Blob, with a safe mime type
 */
export function fileFromBlob(blob: Blob, fileName = "photo.jpg"): File {
  const type = deriveSafeImageMimeType(blob.type);
  return new File([blob], fileName, { type });
}

/**
 * Clear all onboarding-related local storage keys
 */
export function clearAllOnboardingData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_IMAGES);
    localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
    localStorage.removeItem("PROFILE_CREATION");
  } catch {
    // ignore
  }
}

/**
 * Summarize upload errors for toast UX
 */
export function summarizeImageUploadErrors(
  failed: { name: string; reason: string }[],
  sampleCount = 3
) {
  if (failed.length === 0) return "";
  const sample = failed.slice(0, sampleCount).map((f) => `${f.name}: ${f.reason}`).join("; ");
  const extra = failed.length > sampleCount ? `, and ${failed.length - sampleCount} more` : "";
  return `Some images failed to upload (${failed.length}). ${sample}${extra}`;
}

/* ======================
 * High-level image upload orchestration
 * ====================== */

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

/**
 * Upload all pending images collected during the wizard.
 * Handles client-side guards (dimensions, size), obtains upload URLs,
 * uploads with progress, confirms metadata, and returns created imageIds and failures.
 */
export async function uploadPendingImages(params: {
  pendingImages: ImageType[];
  userId: string;
  onProgress?: UploadProgressHandler;
}): Promise<UploadPendingImagesResult> {
  const { pendingImages, userId, onProgress } = params;

  const createdImageIds: string[] = [];
  const failedImages: UploadPendingImagesResultItem[] = [];

  const mgr = createOrGetUploadManager(createUploadManager);
  if (onProgress) mgr.onProgress = onProgress;

  for (let index = 0; index < pendingImages.length; index++) {
    const img = pendingImages[index];
    try {
      // Validate url
      if (!img.url || !img.url.startsWith("blob:")) {
        failedImages.push({
          index,
          id: img.id,
          name: img.fileName || "photo.jpg",
          reason: "Invalid local image URL",
        });
        continue;
      }

      // Read blob
      const blob = await fetchBlobFromObjectURL(img.url);

      // Dimension/aspect ratio guard (best-effort)
      try {
        const tmpUrl = URL.createObjectURL(blob);
        const meta = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const el = new Image();
          el.onload = () =>
            resolve({ width: el.naturalWidth || el.width, height: el.naturalHeight || el.height });
          el.onerror = () => reject(new Error("Failed to decode image for metadata"));
          el.src = tmpUrl;
        });
        URL.revokeObjectURL(tmpUrl);

        const { ok, reason } = validateImageMeta(meta, { minDim: 512, minAspect: 0.5, maxAspect: 2.0 });
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

      // Size guard (5MB)
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

      // Build File object
      const file = fileFromBlob(blob, img.fileName || "photo.jpg");

      // 1) Upload URL
      const uploadUrl = await requestImageUploadUrl();

      // 2) Upload binary
      const uploadResp = await uploadWithProgress(uploadUrl, file, mgr, img.id);
      if (!uploadResp.ok) {
        let errText = uploadResp.statusText;
        try {
          errText = await uploadResp.text();
        } catch {}
        failedImages.push({
          index,
          id: img.id,
          name: file.name,
          reason: `Upload failed (${uploadResp.status})${errText ? `: ${errText}` : ""}`,
        });
        continue;
      }

      // 3) Parse response for storageId
      let storageJson: unknown;
      try {
        storageJson = await uploadResp.json();
      } catch {
        failedImages.push({ index, id: img.id, name: file.name, reason: "Failed to parse upload response" });
        continue;
      }
      const storageId =
        typeof storageJson === "object" && storageJson !== null && "storageId" in storageJson
          ? (storageJson as { storageId?: string }).storageId
          : typeof storageJson === "string"
            ? storageJson
            : null;
      if (!storageId) {
        failedImages.push({ index, id: img.id, name: file.name, reason: "No storageId returned from upload" });
        continue;
      }

      // 4) Confirm metadata -> get imageId
      const meta = await confirmImageMetadata({
        userId,
        storageId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      if (meta?.imageId) {
        createdImageIds.push(meta.imageId);
        safeRevokeObjectURL(img.url);
      } else {
        failedImages.push({ index, id: img.id, name: file.name, reason: "Server did not return imageId" });
        safeRevokeObjectURL(img.url);
        continue;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown image upload error";
      failedImages.push({ index, id: img.id, name: img.fileName || "photo.jpg", reason: message });
    }
  }

  return { createdImageIds, failedImages };
}