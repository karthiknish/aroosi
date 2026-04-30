/**
 * Helpers extracted from ProfileCreationModal to centralize side-effectful calls
 * and keep the component lean/testable.
 */
// onboarding storage keys are used in utils
// image order utility now used within step6 module
import type { ProfileImageInfo } from "@aroosi/shared/types";
import { handleError } from "@/lib/utils/errorHandling";

// Import step-specific helpers
import {
  normalizeStepData as step2_normalizeStepData,
  normalizeHeightInput as step2_normalizeHeightInput,
} from "./profileCreation/step2";
import {
  getGlobalRequiredFields as step7_getGlobalRequiredFields,
  computeMissingRequiredFields as step7_computeMissingRequiredFields,
} from "./profileCreation/step7";
// Re-exported directly further below; no need to import here

/* ======================
 * Upload manager accessor
 * ====================== */

/**
 * Returns a stable, memoized upload manager stored on window to manage progress/cancel.
 * The manager is created lazily via the provided factory.
 */
import { persistPendingImageOrderToLocal } from "./profileCreation/step6";

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
  onProgress?: UploadProgressHandler;
  cleanup?: () => void;
}

/**
 * Factory to create an UploadManager instance.
 * Kept simple: one AbortController reused per upload call; callers may
 * replace with a richer implementation if needed.
 */
export { persistPendingImageOrderToLocal } from "./profileCreation/step6";

/**
 * Upload a file to a pre-signed URL with progress, using the provided manager.
 * Returns the raw Response so callers can parse JSON or read text.
 */
// imported above

/* ======================
 * Required fields helpers
 * ====================== */

/**
 * Global required fields for final submission
 */
export const getGlobalRequiredFields = step7_getGlobalRequiredFields;

/**
 * Step-specific required field mapping.
 * Expand when step forms evolve.
 */
export { getRequiredFieldsForStep } from "./profileCreation/flow";

/* ======================
 * Step navigation / flow helpers (C)
 * ====================== */

/**
 * Clamp and compute next step given current step and whether basic data exists.
 * - totalSteps represents visual progress bar slices; actionable steps end at 7.
 */
export { computeNextStep, normalizeStartStep } from "./profileCreation/flow";

/**
 * Normalize initial step on open:
 * - if hasBasicData from Hero, always show Location step (2)
 * - else start at step 1
 */
// moved to flow

/* ======================
 * Submission orchestration (D)
 * ====================== */

export type { RequiredFieldCheck } from "./profileCreation/step7";
export const computeMissingRequiredFields = step7_computeMissingRequiredFields;

/**
 * Build Profile payload from cleaned data and known mappings
 */
export { buildProfilePayload } from "./profileCreation/step7";

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

export const normalizeHeightInput = step2_normalizeHeightInput;
export const normalizeStepData = step2_normalizeStepData;

/**
 * Parse comma separated city list -> string[] trimmed
 */
export { parsePreferredCities } from "./profileCreation/step5";

/**
 * Filter an object, dropping null/undefined/empty-string/empty-array values
 */
export { filterEmptyValues } from "./profileCreation/step7";

/**
 * Normalize phone number to naive E.164-like (+digits) if possible. Otherwise return original string.
 */
export { normalizePhoneE164Like } from "./profileCreation/step7";

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
        el.focus();
        return field;
      }
    }
  }
  // fallback: scan DOM for any [aria-invalid="true"]
  const anyInvalid = document.querySelector<HTMLElement>(
    '[aria-invalid="true"]'
  );
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
// imported above

/**
 * Create a generic field change handler for the profile creation wizard.
 * Safely updates the shared context and surfaces a toast on failure.
 */
export function createOnChangeHandler(
  updateContextData: (patch: Record<string, unknown>) => void
) {
  return (field: string, value: unknown) => {
    try {
      updateContextData({ [field]: value });
    } catch (err) {
      handleError(
        err,
        {
          scope: "profileCreationHelpers",
          action: "update_profile_creation_field",
          field,
        },
        { customUserMessage: `Failed to update ${field}. Please try again.` }
      );
    }
  };
}

/**
 * Create an images change handler that updates context and local pending images state.
 * Persists local order to storage for resilience across refreshes.
 */
export function createOnProfileImagesChangeHandler(
  onFieldChange: (field: string, value: unknown) => void,
  setPendingImages: (imgs: ProfileImageInfo[]) => void
) {
  return async (imgs: (string | ProfileImageInfo)[]) => {
    const ids = imgs.map((img) =>
      typeof img === "string" ? img : img.storageId
    );
    onFieldChange("profileImageIds", ids);

    try {
      persistPendingImageOrderToLocal(ids);
    } catch (err) {
      console.warn("Unable to store images locally", err);
    }

    const imgObjects = imgs.filter(
      (img): img is ProfileImageInfo => typeof img !== "string"
    );
    setPendingImages(imgObjects);
  };
}

/* ======================
 * Server persistence for final order
 * ====================== */

/**
 * After images are uploaded and server returns image ids, persist the order server-side.
 * Filters out local placeholders defensively.
 */
export { persistServerImageOrder } from "./profileCreation/step6";

/* ======================
 * Image upload orchestration
 * ====================== */

// requestImageUploadUrl() removed: multipart /api/profile-images/upload is used instead

/**
 * Confirm image metadata after successful binary upload.
 */
export async function confirmImageMetadata(_: unknown) {
  throw new Error(
    "Deprecated: metadata saved server-side in /api/profile-images/upload"
  );
}

/**
 * Guard: ensure blob is within size limit and return either ok or error reason
 */
// imported above

/**
 * Try to revoke an object URL and swallow errors
 */
// imported above

/**
 * Derive a safe file type from a blob (fallback to image/jpeg)
 */
// imported above

/**
 * Fetch a Blob from a blob: URL with error handling
 */
// imported above

/**
 * Create a File from a Blob, with a safe mime type
 */
// imported above

/**
 * Clear all onboarding-related local storage keys
 */
export { clearAllOnboardingData } from "./profileCreation/utils";

/**
 * Summarize upload errors for toast UX
 */
export { summarizeImageUploadErrors } from "./profileCreation/step6";

/**
 * Controller hook extracted from ProfileCreationModal.
 * Keeps ProfileCreationModal UI-only by providing all state and handlers.
 */
export { useProfileCreationController } from "./profileCreation/controller";

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
// Delegate to step6 module (keeps public name stable)
export async function uploadPendingImages(params: {
  pendingImages: ProfileImageInfo[];
  userId: string;
  onProgress?: UploadProgressHandler;
}): Promise<UploadPendingImagesResult> {
  const step6 = await import("./profileCreation/step6");
  return step6.uploadPendingImages(params);
}