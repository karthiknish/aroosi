import React from "react";
import { useStepValidation } from "@/hooks/useStepValidation";
import { useClerkAuth as useAuth } from "@/components/ClerkAuthProvider";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { submitProfile, getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";
import type { ImageType } from "@/types/image";

import { computeNextStep, normalizeStartStep } from "./flow";
import { normalizeStepData } from "./step2";
import { getGlobalRequiredFields, computeMissingRequiredFields, normalizePhoneE164Like, filterEmptyValues, buildProfilePayload } from "./step7";
import { uploadPendingImages, persistServerImageOrder, summarizeImageUploadErrors } from "./step6";
import { clearAllOnboardingData } from "./utils";

// Import a few generic helpers from the main helpers module
import { createOnChangeHandler, createOnProfileImagesChangeHandler, focusFirstErrorField } from "../profileCreationHelpers";

export * as Flow from "./flow";
export * as Step2 from "./step2";
export * as Step3 from "./step3";
export * as Step4 from "./step4";
export * as Step5 from "./step5";
export * as Step6 from "./step6";
export * as Step7 from "./step7";
export * from "./types";

export function useProfileCreationController(params: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Record<string, unknown>>;
  router: { push: (p: string) => void };
}) {
  const { isOpen, onClose, router } = params;

  const __isProd = process.env.NODE_ENV === "production";
  const __devLog = React.useCallback((..._args: unknown[]) => {
    if (!__isProd) {
      /* noop in production */
    }
  }, [__isProd]);
  const __devInfo = React.useCallback((..._args: unknown[]) => {
    if (!__isProd) {
      /* noop in production */
    }
  }, [__isProd]);

  const { formData: contextData, updateFormData: updateContextData, step: contextStep, setStep: setContextStep, reset: resetWizard } = useProfileWizard();

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
    partnerPreferenceAgeMin: (contextData?.partnerPreferenceAgeMin as number) || 18,
    partnerPreferenceAgeMax: contextData?.partnerPreferenceAgeMax as number,
    partnerPreferenceCity: (contextData?.partnerPreferenceCity as string[]) || [],
    profileImageIds: (contextData?.profileImageIds as string[]) || [],
  }))();

  const step = Number.isFinite(contextStep) && (contextStep as number) >= 1 && (contextStep as number) <= 7 ? (contextStep as number) : 1;

  const setStep = React.useCallback((newStep: number) => {
    const clamped = Math.max(1, Math.min(7, Math.floor(Number(newStep) || 1)));
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
        window.localStorage.setItem("PROFILE_CREATION", JSON.stringify(snapshot));
      }
    } catch {}
  }, [setContextStep, formData]);

  const [preferredCitiesInput, setPreferredCitiesInput] = React.useState<string>(
    Array.isArray((formData as any).partnerPreferenceCity)
      ? ((formData as any).partnerPreferenceCity as string[]).join(", ")
      : ""
  );
  const partnerPreferenceCityDep = React.useMemo(() => (formData as any).partnerPreferenceCity, [formData]);
  React.useEffect(() => {
    const joined = Array.isArray(partnerPreferenceCityDep) ? (partnerPreferenceCityDep as string[]).join(", ") : "";
    setPreferredCitiesInput(joined);
  }, [partnerPreferenceCityDep]);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = React.useState<ImageType[]>([]);

  const validationData = React.useMemo(() => {
    if (step !== 2) return formData;
    const height = (formData as any).height;
    const normalized = typeof height === "string" && /^\d{2,3}$/.test(height.trim()) ? `${height.trim()} cm` : height;
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
      try { clearAllOnboardingData(); } catch {}
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
    const handler = createOnProfileImagesChangeHandler(onFieldChange, setPendingImages as any);
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
      if ((normalized as any).height !== (formData as any).height) handleInputChange("height", (normalized as any).height as string);
      if ((normalized as any).city !== (formData as any).city) handleInputChange("city", (normalized as any).city as string);
      await new Promise((r) => setTimeout(r, 0));
    }
    const result = await stepValidation.validateCurrentStep();
    if (!result.isValid) {
      try {
        focusFirstErrorField(stepValidation.getFieldError, ["city", "height", "maritalStatus"]);
      } catch {}
      const summary = stepValidation.getValidationSummary();
      showErrorToast(null, summary.summary);
      return;
    }
    if (step < 7) {
      const next = computeNextStep({ step, hasBasicData: !!hasBasicData, direction: "next", min: 1, max: 7 });
      setStep(next);
    }
  };

  const handleBack = async () => {
    if (step > 1) {
      const prev = computeNextStep({ step, hasBasicData: !!hasBasicData, direction: "back", min: 1, max: 7 });
      setStep(prev);
    }
  };

  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if ((event as any).data?.type === "auth-success" && (event as any).data?.isAuthenticated) {
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
          try { await refreshUser(); } catch {}
          try { clearAllOnboardingData(); } catch {}
          showSuccessToast("Account created. Finalizing your profile...");
          handleClose();
          router.push("/success");
          return;
        }

        setHasSubmittedProfile(true);
        try { updateContextData({ lastProfileSubmissionAt: Date.now() }); } catch {}

        const merged: Record<string, unknown> = { ...contextData };
        const cleanedData: Record<string, unknown> = {};
        Object.entries(merged).forEach(([k, v]) => {
          const isValidValue = v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);
          if (isValidValue) cleanedData[k] = v;
        });

        const requiredFields = getGlobalRequiredFields();
        const { missing: missingFields } = computeMissingRequiredFields(cleanedData, requiredFields);
        if (missingFields.length > 0) {
          showErrorToast(null, `Cannot create profile. Missing required fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}. Please go back and complete all sections.`);
          setHasSubmittedProfile(false);
          setIsSubmitting(false);
          return;
        }

        const normalizedPhone = normalizePhoneE164Like(cleanedData.phoneNumber as string) ?? (typeof cleanedData.phoneNumber === "string" ? cleanedData.phoneNumber : "");
        try { if (normalizedPhone) updateContextData({ phoneNumber: normalizedPhone }); } catch {}

        const trimmedData = filterEmptyValues(cleanedData);
        const payload = buildProfilePayload(trimmedData, normalizedPhone || undefined);

        const profileRes = await submitProfile(payload as any, "create");
        if (!profileRes.success) {
          showErrorToast(profileRes.error, "Failed to create profile");
          setHasSubmittedProfile(false);
          setIsSubmitting(false);
          return;
        }

        if (pendingImages.length > 0 && userId) {
          const { createdImageIds, failedImages } = await uploadPendingImages({ pendingImages, userId });
          if (failedImages.length > 0) {
            const mapped = failedImages.map((f) => ({ name: `#${f.index} ${f.name}`, reason: f.reason }));
            const msg = summarizeImageUploadErrors(mapped, 3);
            showErrorToast(null, msg);
            __devInfo("Some images failed to upload. You can retry failed items individually from Step 6.");
          }
          if (createdImageIds.length > 0) {
            try {
              const orderIds = createdImageIds.length > 0 ? createdImageIds : Array.isArray((formData as any).profileImageIds) ? ((formData as any).profileImageIds as string[]) : [];
              const filteredOrderIds = orderIds.filter((id) => typeof id === "string" && !id.startsWith("local-") && id.trim().length > 0);
              if (filteredOrderIds.length > 1) {
                await persistServerImageOrder({ userId: userId as string, imageIds: filteredOrderIds });
              }
            } catch {
              showErrorToast(null, "Unable to save image order. You can reorder later.");
            }
          }
        }

        try { await refreshUser(); } catch {}
        try { clearAllOnboardingData(); } catch {}
        try { if (typeof window !== "undefined") window.localStorage.removeItem("PROFILE_CREATION"); } catch {}
        try { updateContextData({ isProfileComplete: true, isOnboardingComplete: true }); } catch {}
        showSuccessToast("Profile created successfully!");
        handleClose();
        router.push("/success");
      } catch (err: any) {
        let errorMessage = "Profile submission failed";
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("network") || msg.includes("fetch")) errorMessage = "Network error. Please check your connection and try again.";
        else if (msg.includes("timeout")) errorMessage = "Request timed out. Please try again.";
        else if (msg.includes("401") || msg.includes("unauthorized")) errorMessage = "Authentication expired. Please sign in again.";
        else if (msg.includes("409") || msg.includes("duplicate")) errorMessage = "Profile already exists. Please use the profile edit feature.";
        else if (msg.includes("400") || msg.includes("validation")) errorMessage = "Invalid profile data. Please check your information and try again.";
        else if (msg.includes("500") || msg.includes("server")) errorMessage = "Server error while creating profile. Please try again.";
        else if (err?.message) errorMessage = `Profile submission failed: ${err.message}`;
        showErrorToast(null, errorMessage);
        setHasSubmittedProfile(false);
      } finally {
        setIsSubmitting(false);
      }
    };
    void submitProfileAndImages();
  }, [isAuthenticated, validationData, pendingImages, userId, step, hasSubmittedProfile, isSubmitting, refreshUser, onClose, router, signOut, __devInfo, updateContextData, handleClose, __devLog, hasBasicData, formData, contextData]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleUnload = () => {
      try { clearAllOnboardingData(); } catch {}
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
    if (!isOpen) { normalizedOnOpenRef.current = false; return; }
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


