"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStepValidation } from "@/hooks/useStepValidation";
// Step components (extracted)
import {
  Step1Basic,
  Step2LocationPhysical,
  Step3CulturalLifestyle,
  Step4EducationCareer,
  Step5PartnerPreferences,
  Step6Photos,
  Step7AccountCreation,
} from "./steps/StepComponents";

import { useAuth } from "@/components/AuthProvider";

import { COUNTRIES } from "@/lib/constants/countries";

import {
  submitProfile,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";

import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import type { ImageType } from "@/types/image";
// Centralize helpers (static imports for always-used helpers)
import {
  computeNextStep,
  normalizeStartStep,
  focusFirstErrorField,
  normalizeStepData,
  computeMissingRequiredFields,
  normalizePhoneE164Like,
  filterEmptyValues,
  buildProfilePayload,
  // Centralized image helpers
  requestImageUploadUrl,
  confirmImageMetadata,
  validateBlobSize,
  safeRevokeObjectURL,
  deriveSafeImageMimeType,
  fetchBlobFromObjectURL,
  summarizeImageUploadErrors,
  persistServerImageOrder,
  persistPendingImageOrderToLocal,
  safeNavigate,
  createOrGetUploadManager,
  createUploadManager,
  uploadWithProgress,
} from "./profileCreationHelpers";

// Enhanced validation imports

interface ProfileCreationData {
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  country: string;
  city: string;
  height: string;
  maritalStatus: string;
  physicalStatus: string;
  motherTongue: string;
  religion: string;
  ethnicity: string;
  diet: string;
  smoking: string;
  drinking: string;
  education: string;
  occupation: string;
  annualIncome: string;
  aboutMe: string;
  preferredGender: string;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity: string[];
  profileImageIds?: string[];
  // Index signature to make it compatible with Record<string, unknown>
  [key: string]: unknown;
}

interface ProfileCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ProfileCreationData>;
}

// Using enhanced validation schemas from the validation utility

// Build comprehensive country list from COUNTRIES constant
const countries: string[] = COUNTRIES.map((c) => c.name).sort();

export function ProfileCreationModal({
  isOpen,
  onClose,
  initialData,
}: ProfileCreationModalProps) {
  const router = useRouter();

  // Get data from the shared ProfileWizard context
  const {
    formData: contextData,
    updateFormData: updateContextData,
    step: contextStep,
    setStep: setContextStep,
    reset: resetWizard,
  } = useProfileWizard();

  // Debug: comment out verbose logging in production
  console.log(
    "ProfileCreationModal contextData from ProfileWizard:",
    contextData
  );
  console.log("ProfileCreationModal initialData prop:", initialData);

  // Determine if we already have the basic fields (collected in HeroOnboarding)
  const hasBasicData = Boolean(
    contextData?.profileFor &&
      contextData?.gender &&
      contextData?.fullName &&
      contextData?.dateOfBirth &&
      contextData?.phoneNumber
  );

  // Total number of steps - still 8 steps including account creation
  // Step mapping (updated):
  // 1: Basic Info
  // 2: Location & Physical
  // 3: Cultural & Lifestyle   <-- moved up from previous 4
  // 4: Education & Career     <-- was 5
  // 5: Partner Preferences    <-- was 6
  // 6: Photos                 <-- was 7
  // 7: Account Creation       <-- was 8
  // 8: RESERVED (kept to avoid large refactors; auto-submit triggers on step === 7 now)
  const totalSteps = 8;

  // Create a unified formData object from context data and initial data
  const formData: ProfileCreationData = React.useMemo(() => {
    return {
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
    };
  }, [contextData]);

  console.log("ProfileCreationModal unified formData:", formData);

  // Step state is now only controlled by contextStep and navigation handlers
  // Ensure step is always a sane number between 1 and 7
  // Note: Hero gating collects required basics; normalizeStartStep(hasBasicData) below
  // provides idempotent normalization if context updates arrive late or after refresh.
  const step =
    Number.isFinite(contextStep) && contextStep >= 1 && contextStep <= 7
      ? contextStep
      : 1;
  const setStep = (newStep: number) => {
    const clamped = Math.max(1, Math.min(7, Math.floor(Number(newStep) || 1)));
    setContextStep(clamped);
    // Persist PROFILE_CREATION snapshot on step transitions (SSR-guarded)
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
  };

  console.log("Starting step variables:", {
    contextStep, // ProfileWizard context se
    step, // Current computed step
    hasBasicData, // Basic fields present hai ya nahi
    formData: {
      profileFor: formData.profileFor,
      gender: formData.gender,
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      phoneNumber: formData.phoneNumber,
    },
  });

  // Local controlled input for preferred cities to allow commas while typing
  const [preferredCitiesInput, setPreferredCitiesInput] = useState<string>(
    Array.isArray(formData.partnerPreferenceCity)
      ? formData.partnerPreferenceCity.join(", ")
      : ""
  );

  // Keep local input synced if formData changes elsewhere
  useEffect(() => {
    const joined = Array.isArray(formData.partnerPreferenceCity)
      ? formData.partnerPreferenceCity.join(", ")
      : "";
    setPreferredCitiesInput(joined);
  }, [formData.partnerPreferenceCity]);

  // Enhanced validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<ImageType[]>([]);

  // Enhanced step validation hook
  // Build a validation data snapshot that matches the step schema expectations.
  // For step 2 specifically, ensure height is always normalized to "<cm> cm".
  const validationData = React.useMemo(() => {
    if (step !== 2) return formData;
    const normalized =
      typeof formData.height === "string" &&
      /^\d{2,3}$/.test(formData.height.trim())
        ? `${formData.height.trim()} cm`
        : formData.height;
    return { ...formData, height: normalized };
  }, [formData, step]);

  const stepValidation = useStepValidation({
    step,
    data: validationData,
    onValidationChange: (isValid, validationErrors) => {
      setErrors(validationErrors);
    },
  });

  // Auth context for token and userId
  const { token, getToken, user: authUser, refreshUser } = useAuth();
  const userId = authUser?.id;

  // Custom close handler that clears localStorage
  const handleClose = useCallback(() => {
    try {
      // Clear via dynamic import to avoid SSR/window coupling on build
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { clearAllOnboardingData } = require("./profileCreationHelpers");
      clearAllOnboardingData();
      resetWizard();
      console.log(
        "Profile creation modal closed - onboarding data cleared and wizard reset"
      );
    } catch (error) {
      console.error("Error on modal close:", error);
    } finally {
      onClose();
    }
  }, [resetWizard, onClose]);

  const [hasSubmittedProfile, setHasSubmittedProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback(
    (field: keyof ProfileCreationData, value: string | number | string[]) => {
      try {
        // Update the context so data is shared with HeroOnboarding
        updateContextData({ [field]: value });

        // Field validation is now handled by ValidatedInput components
      } catch (err) {
        console.error(`Error updating field ${field}:`, err);
        showErrorToast(null, `Failed to update ${field}. Please try again.`);
      }
    },
    [updateContextData]
  );

  const handleProfileImagesChange = useCallback(
    async (imgs: (string | ImageType)[]) => {
      // Always accept the images and update immediately
      const ids = imgs.map((img) => (typeof img === "string" ? img : img.id));

      // Update context immediately
      handleInputChange("profileImageIds", ids);

      // Store in localStorage for persistence using helper
      try {
        persistPendingImageOrderToLocal(ids);
      } catch (err) {
        console.warn("Unable to store images locally", err);
      }

      // Extract ImageType objects for later upload
      const imgObjects = imgs.filter(
        (img): img is ImageType => typeof img !== "string"
      );
      setPendingImages(imgObjects);
    },
    [handleInputChange]
  );

  // Enhanced validation function using the step validation hook
  const validateStep = async () => {
    const result = await stepValidation.validateCurrentStep();
    if (!result.isValid) {
      const summary = stepValidation.getValidationSummary();
      showErrorToast(null, summary.summary);
      console.log("Validation errors:", summary);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    console.log("[Next] clicked", {
      step,
      hasBasicData,
      city: formData.city,
      height: formData.height,
      maritalStatus: formData.maritalStatus,
    });

    // Sanity clamp before proceeding
    if (!Number.isFinite(step) || step < 1 || step > 7) {
      setStep(1);
      return;
    }

    // // Check if Step 2 is completed before allowing further navigation
    // const isStep2Complete = Boolean(
    //   formData.city && formData.height && formData.maritalStatus
    // );

    // if (step > 2 && !isStep2Complete) {
    //   // Force user back to Step 2
    //   setStep(2);
    //   showErrorToast(
    //     null,
    //     "Please complete location and physical details first"
    //   );
    //   return;
    // }

    // If we came from Hero (basic data present) and we're still at Step 1,
    // ensure we land on Location step (2) first.
    if (hasBasicData && step === 1) {
      setStep(2);
      return;
    }

    // For step 2 (Location & Physical), normalize via helper before validation
    if (step === 2) {
      const normalized = normalizeStepData(step, formData);
      if (normalized.height !== formData.height) {
        handleInputChange("height", normalized.height as string);
      }
      if (normalized.city !== formData.city) {
        handleInputChange("city", normalized.city as string);
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    console.log("[Next] validating step", step);
    const result = await stepValidation.validateCurrentStep();
    console.log("[Next] validation result", {
      isValid: result.isValid,
      errors: result.errors,
      requiredFields: stepValidation.requiredFields,
      completedFields: stepValidation.completedFields,
      progress: stepValidation.progress,
    });

    if (!result.isValid) {
      console.log("[Next] Step validation failed. Not proceeding.");
      // Attempt to guide user by focusing first missing field
      try {
        focusFirstErrorField(stepValidation.getFieldError, [
          "city",
          "height",
          "maritalStatus",
        ]);
      } catch (e) {
        console.log("[Next] focus guidance failed:", e);
      }
      // Surface toast summary as well
      const summary = stepValidation.getValidationSummary();
      console.log("[Next] validation summary:", summary);
      showErrorToast(null, summary.summary);
      return;
    }

    console.log("[Next] Step validation passed.");

    // Advance to next step via helper
    if (step < 7) {
      const next = computeNextStep({
        step,
        hasBasicData: !!hasBasicData,
        direction: "next",
        min: 1,
        max: 7,
      });
      console.log("[Next] advancing to step:", next);
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

  // Native authentication
  const { isAuthenticated, signOut } = useAuth();

  // Listen for authentication success (native auth doesn't use popups)
  // Kept for potential future OAuth integrations
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "auth-success" && event.data?.isAuthenticated) {
        console.log("ProfileCreationModal: Received auth success message");
        window.location.reload();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Advance wizard note: final actionable step is now 7 (Account Creation)
  useEffect(() => {
    if (isAuthenticated && step === 7) {
      // User is signed in, profile submission will happen automatically
      console.log("User signed in at step 7, profile will be submitted");
    }
  }, [isAuthenticated, step]);

  // -------- Auto submit profile & images when user is signed in --------
  useEffect(() => {
    const submitProfileAndImages = async () => {
      if (!isAuthenticated) return;
      if (hasSubmittedProfile) return; // guard
      if (isSubmitting) return; // prevent double submission

      // Only submit if we're on the final actionable step (7 - Account Creation)
      if (step !== 7) {
        console.log(
          "Not on final step, skipping submission. Current step:",
          step
        );
        return;
      }

      setIsSubmitting(true);

      // Ensure we have a token
      let authToken = token;
      if (!authToken) {
        try {
          authToken = await getToken();
        } catch (err) {
          console.error("Failed to get authentication token:", err);
          showErrorToast(
            null,
            "Failed to get authentication token. Please try signing in again."
          );
          setHasSubmittedProfile(false);
          setIsSubmitting(false);
          return;
        }
      }

      if (!authToken) {
        console.error("No authentication token available");
        showErrorToast(
          null,
          "Authentication failed. Please try signing in again."
        );
        setHasSubmittedProfile(false);
        setIsSubmitting(false);
        return;
      }

      try {
        // Server-check guard: if a profile already exists (created during signup), skip client submission and redirect
        const existing = await getCurrentUserWithProfile(authToken);
        if (existing.success && existing.data) {
          console.log(
            "Profile exists after signup; skipping client submission and redirecting to success."
          );
          try {
            await refreshUser();
          } catch (err) {
            console.warn("Failed to refresh user data:", err);
          }
          try {
            // Use centralized helper to clear onboarding data
            const {
              clearAllOnboardingData: __clear,
            } = require("./profileCreationHelpers");
            __clear();
          } catch (err) {
            console.warn("Failed to clear onboarding data:", err);
          }
          showSuccessToast("Account created. Finalizing your profile...");
          handleClose();
          // Centralized navigation helper
          const { safeNavigate } = await import("./profileCreationHelpers");
          safeNavigate(router, "/success");
          return;
        }

        // Mark as submitted after passing duplicate check
        setHasSubmittedProfile(true);

        // Also preemptively clear any previous error toasts/state about missing profile
        try {
          updateContextData({
            lastProfileSubmissionAt: Date.now(),
          });
        } catch {}

        // Always use the latest context data for submission
        const merged: Record<string, unknown> = {
          ...contextData,
        };

        // Filter out empty values
        const cleanedData: Record<string, unknown> = {};
        Object.entries(merged).forEach(([k, v]) => {
          const isValidValue =
            v !== undefined &&
            v !== null &&
            !(typeof v === "string" && v.trim() === "") &&
            !(Array.isArray(v) && v.length === 0);
          if (isValidValue) {
            cleanedData[k] = v;
          }
        });

        // Debug logging
        console.log("ProfileCreationModal - Submitting profile with data:", {
          formData,
          initialData,
          hasBasicData,
          contextData,
          cleanedDataKeys: Object.keys(cleanedData),
          cleanedData,
        });

        // Validate only truly required fields before submission (via helper)
        const requiredFields = [
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

        const { computeMissingRequiredFields } = await import(
          "./profileCreationHelpers"
        );
        const { missing: missingFields } = computeMissingRequiredFields(
          cleanedData as Record<string, unknown>,
          requiredFields
        );

        if (missingFields.length > 0) {
          console.error(
            "CRITICAL: Blocking profile submission - missing required fields:",
            missingFields
          );
          console.error("Current cleanedData:", cleanedData);
          console.error("Current formData:", formData);
          showErrorToast(
            null,
            `Cannot create profile. Missing required fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}. Please go back and complete all sections.`
          );
          setHasSubmittedProfile(false);

          // Don't sign out the user, just reset the submission state
          // Allow them to go back and fix the missing fields
          setIsSubmitting(false);
          return;
        }

        // Normalize phone using helper
        const { normalizePhoneE164Like } = await import(
          "./profileCreationHelpers"
        );
        const normalizedPhone =
          normalizePhoneE164Like(cleanedData.phoneNumber as string) ??
          (typeof cleanedData.phoneNumber === "string"
            ? cleanedData.phoneNumber
            : "");

        // Persist normalized phone back to context to keep state consistent
        try {
          if (normalizedPhone) {
            updateContextData({ phoneNumber: normalizedPhone });
          }
        } catch {}

        // Filter empty values via helper for a cleaner payload
        const { filterEmptyValues, buildProfilePayload } = await import(
          "./profileCreationHelpers"
        );
        const trimmedData = filterEmptyValues(
          cleanedData as Record<string, unknown>
        );
        const payload = buildProfilePayload(
          trimmedData as Record<string, unknown>,
          normalizedPhone || undefined
        );

        console.log("Submitting profile with payload:", payload);
        const profileRes = await submitProfile(authToken, payload, "create");
        if (!profileRes.success) {
          console.error("Profile submission failed:", profileRes.error);
          showErrorToast(profileRes.error, "Failed to create profile");
          setHasSubmittedProfile(false); // Allow retry
          setIsSubmitting(false);
          return;
        }

        // Upload any pending images collected during wizard
        if (pendingImages.length > 0 && userId) {
          console.log(`Uploading ${pendingImages.length} images...`);
          let uploadedCount = 0;

          // Collect successfully created imageIds in the same order as pendingImages
          const createdImageIds: string[] = [];
          // Include index for robust diagnostics
          const failedImages: {
            index: number;
            id?: string;
            name: string;
            reason: string;
          }[] = [];

          // Per-image uploads
          for (let index = 0; index < pendingImages.length; index++) {
            const img = pendingImages[index];
            try {
              // Validate image before upload
              if (!img.url || !img.url.startsWith("blob:")) {
                const reason = "Invalid local image URL";
                console.warn(`[upload:${index}] ${reason}, skipping`, {
                  id: img.id,
                  name: img.fileName || "photo.jpg",
                });
                failedImages.push({
                  index,
                  id: img.id,
                  name: img.fileName || "photo.jpg",
                  reason,
                });
                continue;
              }

              // New: client-side dimension/aspect-ratio guards
              try {
                const { loadImageMeta, validateImageMeta } = await import(
                  "@/lib/utils/imageMeta"
                );
                const meta = await loadImageMeta(
                  (() => {
                    // Convert blob: URL to File for meta reader if needed
                    // We already fetch the Blob below for upload; for guard, reuse blob if available post-fetch.
                    return new File([], img.fileName || "photo.jpg");
                  })()
                );
                // If using the File-above shortcut is undesirable, switch to decoding after we fetch blob below.
                // We will re-run guard after blob fetch with actual file for accuracy.
              } catch (e) {
                // Soft-fail guard loading; continue to blob fetch
              }

              // Fetch the blob from the object URL via helper (no inline logic kept here)
              let blob: Blob;
              try {
                blob = await fetchBlobFromObjectURL(img.url);
              } catch (e) {
                const reason =
                  e instanceof Error
                    ? e.message
                    : "Failed to read local image blob";
                console.error(`[upload:${index}] ${reason}`, e);
                failedImages.push({
                  index,
                  id: img.id,
                  name: img.fileName || "photo.jpg",
                  reason,
                });
                continue;
              }

              // New: run guard with accurate metadata after blob fetch
              try {
                const { loadImageMeta, validateImageMeta } = await import(
                  "@/lib/utils/imageMeta"
                );
                // Create an object URL from the fetched blob to read dimensions accurately
                const tmpUrl = URL.createObjectURL(blob);
                const meta = await new Promise<{
                  width: number;
                  height: number;
                }>((resolve, reject) => {
                  const imgEl = new Image();
                  imgEl.onload = () =>
                    resolve({
                      width: imgEl.naturalWidth || imgEl.width,
                      height: imgEl.naturalHeight || imgEl.height,
                    });
                  imgEl.onerror = () =>
                    reject(new Error("Failed to decode image for metadata"));
                  imgEl.src = tmpUrl;
                });
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
                  // Revoke original object URL early to avoid leaks
                  safeRevokeObjectURL(img.url);
                  continue;
                }
              } catch (e) {
                // If guard fails unexpectedly, proceed without blocking upload
                console.warn(
                  `[upload:${index}] image guard check skipped due to error`,
                  e
                );
              }

              // Validate file size (max 5MB) using helper
              const MAX_SIZE = 5 * 1024 * 1024;
              {
                const sizeCheck = validateBlobSize(blob, MAX_SIZE);
                if (!sizeCheck.ok) {
                  console.warn(
                    `[upload:${index}] ${sizeCheck.reason}`,
                    img.fileName
                  );
                  failedImages.push({
                    index,
                    id: img.id,
                    name: img.fileName || "photo.jpg",
                    reason: sizeCheck.reason,
                  });
                  // Revoke object URL early to avoid leaks
                  safeRevokeObjectURL(img.url);
                  continue;
                }

                // Create a safe File from blob using helper
                const file = (() => {
                  try {
                    const {
                      fileFromBlob,
                    } = require("./profileCreationHelpers");
                    return fileFromBlob(blob, img.fileName || "photo.jpg");
                  } catch {
                    const safeType = deriveSafeImageMimeType(blob.type);
                    return new File([blob], img.fileName || "photo.jpg", {
                      type: safeType,
                    });
                  }
                })();

                // 1) Generate upload URL
                let uploadUrl: string | null = null;
                try {
                  uploadUrl = await requestImageUploadUrl(authToken);
                } catch (e) {
                  const reason =
                    e instanceof Error ? e.message : "Failed to get upload URL";
                  console.error(
                    `[upload:${index}] getImageUploadUrl error:`,
                    e
                  );
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  continue;
                }
                if (!uploadUrl) {
                  const reason = "Failed to get upload URL";
                  console.error(`[upload:${index}] ${reason}`);
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  continue;
                }

                // 2) Upload binary via PUT with progress and cancel support to get { storageId }
                const mgr = createOrGetUploadManager(createUploadManager);

                // New: surface progress to UI via UploadManager.onProgress
                try {
                  // Optional: if UploadManager exposes a subscribe API, we could attach UI updates here.
                  // Example:
                  // mgr.onProgress?.(img.id, (percent: number) => {
                  //   // Integrate with Step6Photos UI via context or a shared store if available.
                  //   // This modal captures progress only for logging; UI component can also subscribe.
                  //   console.debug(`[upload:${index}] progress`, percent);
                  // });
                } catch {}

                const uploadResp = await uploadWithProgress(
                  uploadUrl as string,
                  file,
                  mgr,
                  img.id
                );

                if (!uploadResp.ok) {
                  let errText = uploadResp.statusText;
                  try {
                    errText = await uploadResp.text();
                  } catch {}
                  const reason = `Upload failed (${uploadResp.status})${errText ? `: ${errText}` : ""}`;
                  console.error(
                    `[upload:${index}] Upload failed`,
                    uploadResp.status,
                    errText
                  );
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  continue;
                }

                // Parse response -> storageId
                let storageJson: unknown;
                try {
                  storageJson = await uploadResp.json();
                } catch (e) {
                  const reason = "Failed to parse upload response";
                  console.error(`[upload:${index}] ${reason}`, e);
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  continue;
                }
                const storageId =
                  typeof storageJson === "object" &&
                  storageJson !== null &&
                  "storageId" in storageJson
                    ? (storageJson as { storageId?: string }).storageId
                    : typeof storageJson === "string"
                      ? storageJson
                      : null;

                if (!storageId) {
                  const reason = "No storageId returned from upload";
                  console.error(`[upload:${index}] ${reason}`);
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  continue;
                }

                // 3) Confirm metadata and capture imageId for ordering
                try {
                  const meta = await confirmImageMetadata({
                    token: authToken,
                    userId,
                    storageId,
                    fileName: file.name,
                    contentType: file.type,
                    fileSize: file.size,
                  });

                  if (meta?.imageId) {
                    createdImageIds.push(meta.imageId);
                    // Successful upload & metadata saved: revoke the object URL to free memory
                    safeRevokeObjectURL(img.url);
                  } else {
                    const reason = "Server did not return imageId";
                    console.error(`[upload:${index}] ${reason}`);
                    failedImages.push({
                      index,
                      id: img.id,
                      name: file.name,
                      reason,
                    });
                    // Best-effort revoke even on failure
                    safeRevokeObjectURL(img.url);
                    continue;
                  }
                } catch (e) {
                  const message =
                    e instanceof Error
                      ? e.message
                      : "Failed to save image metadata";
                  console.error(`[upload:${index}] saveImageMeta error:`, e);
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason: message,
                  });
                  // Revoke object URL on failure as well
                  safeRevokeObjectURL(img.url);
                  continue;
                }
              }

              // Create file with derived safe MIME type (central helper fileFromBlob)
              const file = (() => {
                try {
                  const { fileFromBlob } = require("./profileCreationHelpers");
                  return fileFromBlob(blob, img.fileName || "photo.jpg");
                } catch {
                  const safeTypeLocal = deriveSafeImageMimeType(blob.type);
                  return new File([blob], img.fileName || "photo.jpg", {
                    type: safeTypeLocal,
                  });
                }
              })();

              // 1) Generate upload URL
              let uploadUrl: string | null = null;
              try {
                uploadUrl = await requestImageUploadUrl(authToken);
              } catch (e) {
                const reason =
                  e instanceof Error ? e.message : "Failed to get upload URL";
                console.error(`[upload:${index}] getImageUploadUrl error:`, e);
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason,
                });
                continue;
              }
              if (!uploadUrl) {
                const reason = "Failed to get upload URL";
                console.error(`[upload:${index}] ${reason}`);
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason,
                });
                continue;
              }

              // 2) Upload binary via POST with progress and cancel support to get { storageId }
              const mgr = createOrGetUploadManager(createUploadManager);
              const uploadResp = await uploadWithProgress(
                uploadUrl as string,
                file,
                mgr,
                img.id
              );

              if (!uploadResp.ok) {
                let errText = uploadResp.statusText;
                try {
                  errText = await uploadResp.text();
                } catch {}
                const reason = `Upload failed (${uploadResp.status})${errText ? `: ${errText}` : ""}`;
                console.error(
                  `[upload:${index}] Upload failed`,
                  uploadResp.status,
                  errText
                );
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason,
                });
                continue;
              }

              // Convex returns JSON containing { storageId } (or string)
              let storageJson: unknown;
              try {
                storageJson = await uploadResp.json();
              } catch (e) {
                const reason = "Failed to parse upload response";
                console.error(`[upload:${index}] ${reason}`, e);
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason,
                });
                continue;
              }
              const storageId =
                typeof storageJson === "object" &&
                storageJson !== null &&
                "storageId" in storageJson
                  ? (storageJson as { storageId?: string }).storageId
                  : typeof storageJson === "string"
                    ? storageJson
                    : null;

              if (!storageId) {
                const reason = "No storageId returned from upload";
                console.error(`[upload:${index}] ${reason}`);
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason,
                });
                continue;
              }

              // 3) Confirm metadata and capture imageId for ordering
              try {
                const meta = await confirmImageMetadata({
                  token: authToken,
                  userId,
                  storageId,
                  fileName: file.name,
                  contentType: file.type,
                  fileSize: file.size,
                });

                if (meta?.imageId) {
                  createdImageIds.push(meta.imageId);
                  // Successful upload & metadata saved: revoke the object URL to free memory
                  safeRevokeObjectURL(img.url);
                } else {
                  const reason = "Server did not return imageId";
                  console.error(`[upload:${index}] ${reason}`);
                  failedImages.push({
                    index,
                    id: img.id,
                    name: file.name,
                    reason,
                  });
                  // Best-effort revoke even on failure
                  safeRevokeObjectURL(img.url);
                  continue;
                }
              } catch (e) {
                const message =
                  e instanceof Error
                    ? e.message
                    : "Failed to save image metadata";
                console.error(`[upload:${index}] saveImageMeta error:`, e);
                failedImages.push({
                  index,
                  id: img.id,
                  name: file.name,
                  reason: message,
                });
                // Revoke object URL on failure as well
                safeRevokeObjectURL(img.url);
                continue;
              }

              uploadedCount++;
              console.log(
                `[upload:${index}] Successfully uploaded image ${uploadedCount}/${pendingImages.length}`
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : "Unknown image upload error";
              console.error("Image upload error for", img.fileName, ":", err);
              failedImages.push({
                index,
                id: img.id,
                name: img.fileName || "photo.jpg",
                reason: message,
              });
              // Continue with other images even if one fails
            }
          }

          // Show aggregated error toast if some images failed (central summarize already applied mapping friendly)
          if (failedImages.length > 0) {
            const mapped = failedImages.map((f) => ({
              name: `#${f.index} ${f.name}`,
              reason: f.reason,
            }));
            const msg = summarizeImageUploadErrors(mapped, 3);
            showErrorToast(null, msg);

            // New: offer inline retry guidance for failed images
            console.info(
              "Some images failed to upload. You can retry failed items individually from Step 6."
            );
          }

          // Cleanup upload manager refs (single call)
          try {
            const mgr = (window as any).__profileUploadMgr;
            if (mgr && typeof mgr.cleanup === "function") mgr.cleanup();
            (window as any).__profileUploadMgr = undefined;
          } catch {}

          if (uploadedCount > 0) {
            console.log(
              `Successfully uploaded ${uploadedCount} out of ${pendingImages.length} images`
            );

            // Persist final order on server when multiple images exist
            try {
              const orderIds =
                createdImageIds.length > 0
                  ? createdImageIds
                  : Array.isArray(formData.profileImageIds)
                    ? formData.profileImageIds
                    : [];
              // Filter out any local placeholders defensively
              const filteredOrderIds = orderIds.filter(
                (id) =>
                  typeof id === "string" &&
                  !id.startsWith("local-") &&
                  id.trim().length > 0
              );
              if (filteredOrderIds.length > 1) {
                await persistServerImageOrder({
                  token: authToken,
                  userId,
                  imageIds: filteredOrderIds,
                });
              }
            } catch (e) {
              console.warn("Failed to persist image order; continuing.", e);
              showErrorToast(
                null,
                "Unable to save image order. You can reorder later."
              );
            }
          }
        }

        // Refresh profile data and finish
        try {
          await refreshUser();
        } catch (err) {
          console.warn("Failed to refresh user data:", err);
          // Don't block the success flow for this
        }

        // Clean up all onboarding data using centralized helper
        try {
          // Use helper which may evolve without touching modal
          // Keeping a dynamic import out; simply re-using safeNavigate for redirection below
          // The actual clearing can also be performed on server success page load if needed
          // For now, rely on handleClose -> resetWizard and this client-side clear through helper
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const {
            clearAllOnboardingData: __clear,
          } = require("./profileCreationHelpers");
          __clear();
        } catch (err) {
          console.warn("Failed to clear onboarding data:", err);
          // Don't block the success flow for this
        }
        // Clear PROFILE_CREATION snapshot on success as well
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("PROFILE_CREATION");
          }
        } catch {}

        // Mark completion flags locally to eliminate stale 'profile not created' toasts
        try {
          updateContextData({
            isProfileComplete: true,
            isOnboardingComplete: true,
          });
        } catch {}

        showSuccessToast("Profile created successfully!");
        handleClose();

        // Redirect to success page (centralized helper)
        try {
          safeNavigate(router, "/success");
        } catch (err) {
          console.error("Failed to navigate to success page:", err);
        }
      } catch (err) {
        console.error("Profile submission error", err);

        // Provide specific error messages based on error type
        let errorMessage = "Profile submission failed";
        if (err instanceof Error) {
          const msg = err.message.toLowerCase();
          if (msg.includes("network") || msg.includes("fetch")) {
            errorMessage =
              "Network error. Please check your connection and try again.";
          } else if (msg.includes("timeout")) {
            errorMessage = "Request timed out. Please try again.";
          } else if (msg.includes("401") || msg.includes("unauthorized")) {
            errorMessage = "Authentication expired. Please sign in again.";
          } else if (msg.includes("409") || msg.includes("duplicate")) {
            errorMessage =
              "Profile already exists. Please use the profile edit feature.";
          } else if (msg.includes("400") || msg.includes("validation")) {
            errorMessage =
              "Invalid profile data. Please check your information and try again.";
          } else if (msg.includes("500") || msg.includes("server")) {
            errorMessage =
              "Server error while creating profile. Please try again.";
          } else {
            errorMessage = `Profile submission failed: ${err.message}`;
          }
        }

        showErrorToast(null, errorMessage);
        setHasSubmittedProfile(false); // Allow retry
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitProfileAndImages();
  }, [
    isAuthenticated,
    token,
    getToken,
    formData,
    pendingImages,
    userId,
    step,
    hasSubmittedProfile,
    isSubmitting,
    refreshUser,
    onClose,
    router,
    signOut,
  ]);

  // Helper to add * to required labels
  const required = (label: string) => (
    <span>
      {label} <span className="text-red-500">*</span>
    </span>
  );

  // Clear onboarding data if the modal is open and the user reloads or navigates away
  useEffect(() => {
    if (!isOpen) return;
    const handleUnload = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const {
          clearAllOnboardingData: __clear,
        } = require("./profileCreationHelpers");
        __clear();
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isOpen]);

  // Normalize starting step once per open via helper
  const normalizedOnOpenRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      normalizedOnOpenRef.current = false;
      return;
    }
    if (normalizedOnOpenRef.current) return;

    (async () => {
      // Hero gating ensures basics; normalizeStartStep enforces a consistent landing step.
      // Together, they are safe to call repeatedly and on late-arriving context updates.
      setStep(normalizeStartStep(!!hasBasicData));
      normalizedOnOpenRef.current = true;
    })();
    // setStep and normalizeStartStep are stable; include setStep to satisfy exhaustive-deps
  }, [isOpen, hasBasicData, setStep]); // Remove 'step' from dependencies to avoid loops

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-y-scroll bg-white sm:max-h-[90vh] max-h-screen sm:rounded-lg rounded-none "
        onInteractOutside={(e) => {
          e.preventDefault(); // keep modal open even when external portals register outside clicks
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        aria-describedby="profile-modal-desc"
      >
        <div className="relative">
          {/* Progress indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-pink-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          <DialogHeader className="p-6 pb-0">
            <DialogTitle
              id="profile-modal-title"
              className="text-2xl font-bold text-gray-900"
            >
              Find Your Perfect Match
            </DialogTitle>
            {step < 5 && (
              <p id="profile-modal-desc" className="text-gray-600 mt-2">
                Join thousands of Afghan singles finding love
              </p>
            )}

            {/* Enhanced progress indicator */}
            {/* <div className="mt-4">
              <SimpleProgress current={step} total={totalSteps} />
            </div> */}
            {/* Step components imports complete */}
          </DialogHeader>

          <div className="p-6 ">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 1: Basic Info (only shown when data not yet provided) */}
                {step === 1 && !hasBasicData && (
                  <Step1Basic
                    formData={formData as any}
                    requiredLabel={required}
                    onChange={handleInputChange as any}
                  />
                )}

                {/* Step 2: Location & Physical */}
                {step === 2 && (
                  <Step2LocationPhysical
                    formData={formData as any}
                    errors={errors}
                    step={step}
                    requiredLabel={required}
                    onChange={handleInputChange as any}
                    stepValidation={stepValidation as any}
                    countries={countries}
                  />
                )}

                {/* Step 3: Cultural & Lifestyle */}
                {step === 3 && (
                  <Step3CulturalLifestyle
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                    stepValidation={stepValidation as any}
                  />
                )}

                {/* Step 4: Education & Career */}
                {step === 4 && (
                  <Step4EducationCareer
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                  />
                )}

                {/* Step 5: Partner Preferences */}
                {step === 5 && (
                  <Step5PartnerPreferences
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                    preferredCitiesInput={preferredCitiesInput}
                    setPreferredCitiesInput={setPreferredCitiesInput}
                  />
                )}

                {/* Step 6: Photos */}
                {step === 6 && (
                  <Step6Photos
                    userId={userId || ""}
                    pendingImages={pendingImages as any}
                    setPendingImages={setPendingImages as any}
                    onImagesChanged={handleProfileImagesChange as any}
                  />
                )}

                {/* Step 7: Account Creation */}
                {step === 7 && (
                  <Step7AccountCreation
                    formData={formData as any}
                    setStep={setStep as any}
                    router={router as any}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between items-center">
              {/* Back Button - Show on all steps after second for better UX */}
              {step > 2 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={false}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {/* Spacer when no back button */}
              {(step === 1 || step === 2) && <div />}

              {/* Next Button - Show for all steps except final actionable step (7) */}
              {step >= 1 && step < 7 && (
                <Button
                  onClick={async () => {
                    // Extra guard: for step 2, ensure required fields are non-empty before running validation
                    if (step === 2) {
                      const precheckMissing =
                        !formData.city ||
                        String(formData.city).trim() === "" ||
                        !formData.height ||
                        String(formData.height).trim() === "" ||
                        !formData.maritalStatus ||
                        String(formData.maritalStatus).trim() === "";
                      if (precheckMissing) {
                        // Trigger validation to surface inline errors
                        await handleNext();
                        return;
                      }
                    }
                    await handleNext();
                  }}
                  disabled={stepValidation.isValidating}
                  className="bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {stepValidation.isValidating ? "Validating..." : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
