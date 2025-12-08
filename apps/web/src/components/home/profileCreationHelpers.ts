/**
 * Helpers extracted from ProfileCreationModal to centralize side-effectful calls
 * and keep the component lean/testable.
 */
// onboarding storage keys are used in utils
// image order utility now used within step6 module
import type { ImageType } from "@/types/image";
import { showErrorToast } from "@/lib/ui/toast";

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
      console.error(`Error updating field ${field}:`, err);
      showErrorToast(null, `Failed to update ${field}. Please try again.`);
    }
  };
}

/**
 * Create an images change handler that updates context and local pending images state.
 * Persists local order to storage for resilience across refreshes.
 */
export function createOnProfileImagesChangeHandler(
  onFieldChange: (field: string, value: unknown) => void,
  setPendingImages: (imgs: ImageType[]) => void
) {
  return async (imgs: (string | ImageType)[]) => {
    const ids = imgs.map((img) => (typeof img === "string" ? img : img.id));
    onFieldChange("profileImageIds", ids);

    try {
      persistPendingImageOrderToLocal(ids);
    } catch (err) {
      console.warn("Unable to store images locally", err);
    }

    const imgObjects = imgs.filter(
      (img): img is ImageType => typeof img !== "string"
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
export async function confirmImageMetadata(_: any) {
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

/*
  const __isProd = process.env.NODE_ENV === "production";
  const __devLog = React.useCallback(
    (...args: unknown[]) => {
      if (!__isProd) {
        // eslint-disable-next-line no-console
        console.log(...args);
      }
    },
    [__isProd]
  );
  const __devInfo = React.useCallback(
    (...args: unknown[]) => {
      if (!__isProd) {
        // eslint-disable-next-line no-console
        console.info(...args);
      }
    },
    [__isProd]
  );

  const {
    formData: contextData,
    updateFormData: updateContextData,
    step: contextStep,
    setStep: setContextStep,
    reset: resetWizard,
  } = useProfileWizard();

  const hasBasicData = Boolean(
    contextData?.profileFor &&
      contextData?.gender &&
      contextData?.fullName &&
      contextData?.dateOfBirth &&
      contextData?.phoneNumber
  );

  const totalSteps = 8;

  const formData = ((): Record<string, unknown> => ({
    profileFor: (contextData?.profileFor as string) || "",
    gender: (contextData?.gender as string) || "",
    fullName: (contextData?.fullName as string) || "",
    dateOfBirth: (contextData?.dateOfBirth as string) || "",
    email: (contextData?.email as string) || "",
    phoneNumber: (contextData?.phoneNumber as string) || "",
    country: (contextData?.country as string) || "",
    city: (contextData?.city as string) || "",
    height: (contextData?.height as string) || "",
    maritalStatus: (contextData?.maritalStatus as string) || "",
    physicalStatus: (contextData?.physicalStatus as string) || "",
    motherTongue: (contextData?.motherTongue as string) || "",
    religion: (contextData?.religion as string) || "",
    ethnicity: (contextData?.ethnicity as string) || "",
    diet: (contextData?.diet as string) || "",
    smoking: (contextData?.smoking as string) || "",
    drinking: (contextData?.drinking as string) || "",
    education: (contextData?.education as string) || "",
    occupation: (contextData?.occupation as string) || "",
    annualIncome: (contextData?.annualIncome as string) || "",
    aboutMe: (contextData?.aboutMe as string) || "",
    preferredGender: (contextData?.preferredGender as string) || "",
    partnerPreferenceAgeMin:
      (contextData?.partnerPreferenceAgeMin as number) || 18,
    partnerPreferenceAgeMax: contextData?.partnerPreferenceAgeMax as number,
    partnerPreferenceCity:
      (contextData?.partnerPreferenceCity as string[]) || [],
    profileImageIds: (contextData?.profileImageIds as string[]) || [],
  }))();

  const step =
    Number.isFinite(contextStep) &&
    (contextStep as number) >= 1 &&
    (contextStep as number) <= 7
      ? (contextStep as number)
      : 1;

  const setStep = React.useCallback(
    (newStep: number) => {
      const clamped = Math.max(
        1,
        Math.min(7, Math.floor(Number(newStep) || 1))
      );
      setContextStep(clamped);
      try {
        if (typeof window !== "undefined") {
          const snapshot = {
            step: clamped,
            data: {
              fullName: (formData as any)?.fullName ?? "",
              dateOfBirth: (formData as any)?.dateOfBirth ?? "",
              phoneNumber: (formData as any)?.phoneNumber ?? "",
              city: (formData as any)?.city ?? "",
              height: (formData as any)?.height ?? "",
              maritalStatus: (formData as any)?.maritalStatus ?? "",
            },
          };
          window.localStorage.setItem(
            "PROFILE_CREATION",
            JSON.stringify(snapshot)
          );
        }
      } catch {}
    },
    [setContextStep, formData]
  );

  const [preferredCitiesInput, setPreferredCitiesInput] =
    React.useState<string>(
      Array.isArray((formData as any).partnerPreferenceCity)
        ? ((formData as any).partnerPreferenceCity as string[]).join(", ")
        : ""
    );
  const partnerPreferenceCityDep = React.useMemo(
    () => (formData as any).partnerPreferenceCity,
    [formData]
  );
  React.useEffect(() => {
    const joined = Array.isArray(partnerPreferenceCityDep)
      ? (partnerPreferenceCityDep as string[]).join(", ")
      : "";
    setPreferredCitiesInput(joined);
  }, [partnerPreferenceCityDep]);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = React.useState<ImageType[]>([]);

  const validationData = React.useMemo(() => {
    if (step !== 2) return formData;
    const height = (formData as any).height;
    const normalized =
      typeof height === "string" && /^\d{2,3}$/.test(height.trim())
        ? `${height.trim()} cm`
        : height;
    return { ...(formData as any), height: normalized } as any;
  }, [formData, step]);

  const stepValidation = useStepValidation({
    step,
    data: validationData as any,
    onValidationChange: (_isValid, validationErrors) => {
      setErrors(validationErrors);
    },
  });

  const { user: authUser, refreshUser, isAuthenticated, signOut } = useAuth();
  const userId = (authUser as any)?.id as string | undefined;

  const handleClose = React.useCallback(() => {
    try {
      const { clearAllOnboardingData } = await import("./profileCreation/utils");
      try {
        clearAllOnboardingData();
      } catch {}
      resetWizard();
      __devLog("Profile creation modal closed - data cleared and wizard reset");
    } catch (error) {
      console.error("Error on modal close:", error);
    } finally {
      onClose();
    }
  }, [resetWizard, __devLog, onClose]);

  const [hasSubmittedProfile, setHasSubmittedProfile] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleInputChange = (field: string, value: unknown) => {
    const onChange = createOnChangeHandler(updateContextData as any);
    onChange(field, value);
  };

  const handleProfileImagesChange = async (imgs: (string | ImageType)[]) => {
    const onFieldChange = createOnChangeHandler(updateContextData as any);
    const handler = createOnProfileImagesChangeHandler(
      onFieldChange,
      setPendingImages as any
    );
    await handler(imgs);
  };

  const handleNext = async () => {
    if (!Number.isFinite(step) || step < 1 || step > 7) {
      setStep(1);
      return;
    }
    if (hasBasicData && step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const normalized = normalizeStepData(step, formData as any);
      if ((normalized as any).height !== (formData as any).height) {
        handleInputChange("height", (normalized as any).height as string);
      }
      if ((normalized as any).city !== (formData as any).city) {
        handleInputChange("city", (normalized as any).city as string);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    const result = await stepValidation.validateCurrentStep();
    if (!result.isValid) {
      try {
        focusFirstErrorField(stepValidation.getFieldError, [
          "city",
          "height",
          "maritalStatus",
        ]);
      } catch {}
      const summary = stepValidation.getValidationSummary();
      showErrorToast(null, summary.summary);
      return;
    }
    if (step < 7) {
      const next = computeNextStep({
        step,
        hasBasicData: !!hasBasicData,
        direction: "next",
        min: 1,
        max: 7,
      });
      setStep(next);
    }
  };

  const handleBack = async () => {
    if (step > 1) {
      const prev = computeNextStep({
        step,
        hasBasicData: !!hasBasicData,
        direction: "back",
        min: 1,
        max: 7,
      });
      setStep(prev);
    }
  };

  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (
        (event as any).data?.type === "auth-success" &&
        (event as any).data?.isAuthenticated
      ) {
        window.location.reload();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && step === 7) {
      __devLog("User signed in at step 7, profile will be submitted");
    }
  }, [isAuthenticated, step, __devLog]);

  React.useEffect(() => {
    const submitProfileAndImages = async () => {
      if (!isAuthenticated) return;
      if (hasSubmittedProfile) return;
      if (isSubmitting) return;
      if (step !== 7) return;

      setIsSubmitting(true);
      try {
        const existing = await getCurrentUserWithProfile();
        if (existing.success && existing.data) {
          try {
            await refreshUser();
          } catch {}
          try {
            const { clearAllOnboardingData: __clear } = await import(
              "./profileCreationHelpers"
            );
            __clear();
          } catch {}
          showSuccessToast("Account created. Finalizing your profile...");
          handleClose();
          safeNavigate(router, "/success");
          return;
        }

        setHasSubmittedProfile(true);
        try {
          updateContextData({ lastProfileSubmissionAt: Date.now() });
        } catch {}

        const merged: Record<string, unknown> = { ...contextData };
        const cleanedData: Record<string, unknown> = {};
        Object.entries(merged).forEach(([k, v]) => {
          const isValidValue =
            v !== undefined &&
            v !== null &&
            !(typeof v === "string" && v.trim() === "") &&
            !(Array.isArray(v) && v.length === 0);
          if (isValidValue) cleanedData[k] = v;
        });

        const requiredFields = getGlobalRequiredFields();
        const { computeMissingRequiredFields } = await import(
          "./profileCreationHelpers"
        );
        const { missing: missingFields } = computeMissingRequiredFields(
          cleanedData,
          requiredFields
        );
        if (missingFields.length > 0) {
          showErrorToast(
            null,
            `Cannot create profile. Missing required fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}. Please go back and complete all sections.`
          );
          setHasSubmittedProfile(false);
          setIsSubmitting(false);
          return;
        }

        const normalizedPhone =
          normalizePhoneE164Like(cleanedData.phoneNumber as string) ??
          (typeof cleanedData.phoneNumber === "string"
            ? cleanedData.phoneNumber
            : "");
        try {
          if (normalizedPhone)
            updateContextData({ phoneNumber: normalizedPhone });
        } catch {}

        const trimmedData = filterEmptyValues(cleanedData);
        const payload = buildProfilePayload(
          trimmedData,
          normalizedPhone || undefined
        );

        const profileRes = await submitProfile(payload as any, "create");
        if (!profileRes.success) {
          showErrorToast(profileRes.error, "Failed to create profile");
          setHasSubmittedProfile(false);
          setIsSubmitting(false);
          return;
        }

        if (pendingImages.length > 0 && userId) {
          const { createdImageIds, failedImages } = await uploadPendingImages({
            pendingImages,
            userId,
          });
          if (failedImages.length > 0) {
            const mapped = failedImages.map((f) => ({
              name: `#${f.index} ${f.name}`,
              reason: f.reason,
            }));
            const msg = summarizeImageUploadErrors(mapped, 3);
            showErrorToast(null, msg);
            __devInfo(
              "Some images failed to upload. You can retry failed items individually from Step 6."
            );
          }
          if (createdImageIds.length > 0) {
            try {
              const orderIds =
                createdImageIds.length > 0
                  ? createdImageIds
                  : Array.isArray((formData as any).profileImageIds)
                    ? ((formData as any).profileImageIds as string[])
                    : [];
              const filteredOrderIds = orderIds.filter(
                (id) =>
                  typeof id === "string" &&
                  !id.startsWith("local-") &&
                  id.trim().length > 0
              );
              if (filteredOrderIds.length > 1) {
                await persistServerImageOrder({
                  userId: userId as string,
                  imageIds: filteredOrderIds,
                });
              }
            } catch {
              showErrorToast(
                null,
                "Unable to save image order. You can reorder later."
              );
            }
          }
        }

        try {
          await refreshUser();
        } catch {}
        try {
          const { clearAllOnboardingData: __clear } = await import(
            "./profileCreationHelpers"
          );
          __clear();
        } catch {}
        try {
          if (typeof window !== "undefined")
            window.localStorage.removeItem("PROFILE_CREATION");
        } catch {}
        try {
          updateContextData({
            isProfileComplete: true,
          });
        } catch {}
        showSuccessToast("Profile created successfully!");
        handleClose();
        safeNavigate(router, "/success");
      } catch (err: any) {
        let errorMessage = "Profile submission failed";
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("network") || msg.includes("fetch"))
          errorMessage =
            "Network error. Please check your connection and try again.";
        else if (msg.includes("timeout"))
          errorMessage = "Request timed out. Please try again.";
        else if (msg.includes("401") || msg.includes("unauthorized"))
          errorMessage = "Authentication expired. Please sign in again.";
        else if (msg.includes("409") || msg.includes("duplicate"))
          errorMessage =
            "Profile already exists. Please use the profile edit feature.";
        else if (msg.includes("400") || msg.includes("validation"))
          errorMessage =
            "Invalid profile data. Please check your information and try again.";
        else if (msg.includes("500") || msg.includes("server"))
          errorMessage =
            "Server error while creating profile. Please try again.";
        else if (err?.message)
          errorMessage = `Profile submission failed: ${err.message}`;
        showErrorToast(null, errorMessage);
        setHasSubmittedProfile(false);
      } finally {
        setIsSubmitting(false);
      }
    };
    void submitProfileAndImages();
  }, [
    isAuthenticated,
    validationData,
    pendingImages,
    userId,
    step,
    hasSubmittedProfile,
    isSubmitting,
    refreshUser,
    onClose,
    router,
    signOut,
    __devInfo,
    updateContextData,
    handleClose,
    __devLog,
    hasBasicData,
    formData,
    contextData,
  ]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleUnload = () => {
      try {
        void import("./profileCreation/utils").then((m) => {
          try { m.clearAllOnboardingData(); } catch {}
        });
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isOpen]);

  const normalizedOnOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) {
      normalizedOnOpenRef.current = false;
      return;
    }
    if (normalizedOnOpenRef.current) return;
    setStep(normalizeStartStep(!!hasBasicData));
    normalizedOnOpenRef.current = true;
  }, [isOpen, hasBasicData, setStep]);

  return {
    step,
    setStep,
    totalSteps,
    formData: formData as any,
    hasBasicData,
    errors,
    stepValidation,
    preferredCitiesInput,
    setPreferredCitiesInput,
    pendingImages,
    setPendingImages,
    userId: userId || "",
    handleClose,
    handleNext,
    handleBack,
    handleInputChange,
    handleProfileImagesChange,
  } as const;
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
// Delegate to step6 module (keeps public name stable)
export async function uploadPendingImages(params: {
  pendingImages: ImageType[];
  userId: string;
  onProgress?: UploadProgressHandler;
}): Promise<UploadPendingImagesResult> {
  const step6 = await import("./profileCreation/step6");
  return step6.uploadPendingImages(params as any);
}