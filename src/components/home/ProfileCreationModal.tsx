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
// CustomSignupForm is rendered inside Step7AccountCreation
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
  summarizeImageUploadErrors,
  persistServerImageOrder,
  persistPendingImageOrderToLocal,
  safeNavigate,
  getGlobalRequiredFields,
  filterEmptyValues,
  buildProfilePayload,
  normalizePhoneE164Like,
  uploadPendingImages,
} from "./profileCreationHelpers";

// Enhanced validation imports
// Dev logging helpers (no-op in production)
const __isProd = process.env.NODE_ENV === "production";
const __devLog = (...args: unknown[]) => {
  if (!__isProd) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
const __devInfo = (...args: unknown[]) => {
  if (!__isProd) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
};

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

  // Debug (silenced in production)
  __devLog("ProfileCreationModal contextData from ProfileWizard:", contextData);
  __devLog("ProfileCreationModal initialData prop:", initialData);

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

  __devLog("ProfileCreationModal unified formData:", formData);

  // Step state is now only controlled by contextStep and navigation handlers
  // Ensure step is always a sane number between 1 and 7
  // Note: Hero gating collects required basics; normalizeStartStep(hasBasicData) below
  // provides idempotent normalization if context updates arrive late or after refresh.
  const step =
    Number.isFinite(contextStep) && contextStep >= 1 && contextStep <= 7
      ? contextStep
      : 1;
  const setStep = React.useCallback(
    (newStep: number) => {
      const clamped = Math.max(
        1,
        Math.min(7, Math.floor(Number(newStep) || 1))
      );
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
    },
    [setContextStep, formData]
  );

  __devLog("Starting step variables:", {
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

  // Auth context for userId only (no tokens stored client-side)
  const { user: authUser, refreshUser } = useAuth();
  const userId = authUser?.id;

  // Custom close handler that clears localStorage
  const handleClose = useCallback(() => {
    try {
      // Clear via dynamic import to avoid SSR/window coupling on build
      void import("./profileCreationHelpers").then((m) => {
        try {
          m.clearAllOnboardingData();
        } catch {}
      });
      resetWizard();
      __devLog(
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
      const { createOnChangeHandler } = require("./profileCreationHelpers");
      const onChange = createOnChangeHandler(updateContextData as any);
      onChange(field as string, value);
    },
    [updateContextData]
  );

  const handleProfileImagesChange = useCallback(
    async (imgs: (string | ImageType)[]) => {
      const {
        createOnProfileImagesChangeHandler,
        createOnChangeHandler,
      } = require("./profileCreationHelpers");
      const onFieldChange = createOnChangeHandler(updateContextData as any);
      const handler = createOnProfileImagesChangeHandler(
        onFieldChange,
        setPendingImages as any
      );
      await handler(imgs);
    },
    [updateContextData, setPendingImages]
  );

  // Enhanced validation function using the step validation hook
  // validateStep removed; inline validation is used

  const handleNext = async () => {
    __devLog("[Next] clicked", {
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

    __devLog("[Next] validating step", step);
    const result = await stepValidation.validateCurrentStep();
    __devLog("[Next] validation result", {
      isValid: result.isValid,
      errors: result.errors,
      requiredFields: stepValidation.requiredFields,
      completedFields: stepValidation.completedFields,
      progress: stepValidation.progress,
    });

    if (!result.isValid) {
      __devLog("[Next] Step validation failed. Not proceeding.");
      // Attempt to guide user by focusing first missing field
      try {
        focusFirstErrorField(stepValidation.getFieldError, [
          "city",
          "height",
          "maritalStatus",
        ]);
      } catch (e) {
        __devLog("[Next] focus guidance failed:", e);
      }
      // Surface toast summary as well
      const summary = stepValidation.getValidationSummary();
      __devLog("[Next] validation summary:", summary);
      showErrorToast(null, summary.summary);
      return;
    }

    __devLog("[Next] Step validation passed.");

    // Advance to next step via helper
    if (step < 7) {
      const next = computeNextStep({
        step,
        hasBasicData: !!hasBasicData,
        direction: "next",
        min: 1,
        max: 7,
      });
      __devLog("[Next] advancing to step:", next);
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

  // Native authentication (no token/getToken usage)
  const { isAuthenticated, signOut } = useAuth();

  // Listen for authentication success (native auth doesn't use popups)
  // Kept for potential future OAuth integrations
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "auth-success" && event.data?.isAuthenticated) {
        __devLog("ProfileCreationModal: Received auth success message");
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
      __devLog("User signed in at step 7, profile will be submitted");
    }
  }, [isAuthenticated, step]);

  // -------- Auto submit profile & images when user is signed in --------
  useEffect(() => {
    const submitProfileAndImages = async () => {
      // Hydration-safe guard: only proceed after auth is fully loaded and authenticated
      // and avoid duplicate or concurrent submissions
      if (!isAuthenticated) return;
      if (hasSubmittedProfile) return; // guard
      if (isSubmitting) return; // prevent double submission

      // Only submit if we're on the final actionable step (7 - Account Creation)
      if (step !== 7) {
        __devLog("Not on final step, skipping submission. Current step:", step);
        return;
      }

      setIsSubmitting(true);

      try {
        // Server-check guard: if a profile already exists (created during signup), skip client submission and redirect
        const existing = await getCurrentUserWithProfile();
        if (existing.success && existing.data) {
          __devLog(
            "Profile exists after signup; skipping client submission and redirecting to success."
          );
          try {
            await refreshUser();
          } catch (err) {
            console.warn("Failed to refresh user data:", err);
          }
          try {
            // Use centralized helper to clear onboarding data
            const { clearAllOnboardingData: __clear } = await import(
              "./profileCreationHelpers"
            );
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
        __devLog("ProfileCreationModal - Submitting profile with data:", {
          formData,
          initialData,
          hasBasicData,
          contextData,
          cleanedDataKeys: Object.keys(cleanedData),
          cleanedData,
        });

        // Validate only truly required fields before submission (via helper)
        const requiredFields = getGlobalRequiredFields();

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
        const trimmedData = filterEmptyValues(
          cleanedData as Record<string, unknown>
        );
        const payload = buildProfilePayload(
          trimmedData as Record<string, unknown>,
          normalizedPhone || undefined
        );

        __devLog("Submitting profile with payload:", payload);
        const profileRes = await submitProfile(payload, "create");
        if (!profileRes.success) {
          console.error("Profile submission failed:", profileRes.error);
          showErrorToast(profileRes.error, "Failed to create profile");
          setHasSubmittedProfile(false); // Allow retry
          setIsSubmitting(false);
          return;
        }

        // Upload any pending images collected during wizard (delegated)
        if (pendingImages.length > 0 && userId) {
          __devLog(`Uploading ${pendingImages.length} images...`);
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
                  : Array.isArray(formData.profileImageIds)
                    ? formData.profileImageIds
                    : [];
              const filteredOrderIds = orderIds.filter(
                (id) =>
                  typeof id === "string" &&
                  !id.startsWith("local-") &&
                  id.trim().length > 0
              );
              if (filteredOrderIds.length > 1) {
                await persistServerImageOrder({
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
          // Ensure latest session state is reflected after submissions
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
          const { clearAllOnboardingData: __clear } = await import(
            "./profileCreationHelpers"
          );
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
    // This effect purposefully runs when the core submission drivers change.
    // Some dependencies (contextData, initialData) are not included to avoid
    // excessive re-runs; formData is memoized and already represents them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
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
        void import("./profileCreationHelpers").then((m) => {
          try {
            m.clearAllOnboardingData();
          } catch {}
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
                    setStep={setStep}
                    router={router as any}
                    onComplete={() => {
                      try {
                        showSuccessToast(
                          "Account created. Finalizing your profile..."
                        );
                      } catch {}
                    }}
                    onError={(msg?: string) => {
                      const m =
                        typeof msg === "string" && msg.trim().length > 0
                          ? msg
                          : "Sign up failed";
                      showErrorToast(m);
                    }}
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
                        showErrorToast(null, "Please complete location and physical details");
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
