"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/components/AuthProvider";
import { LocalImageUpload } from "@/components/LocalImageUpload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import { COUNTRIES } from "@/lib/constants/countries";
import CustomSignupForm from "@/components/auth/CustomSignupForm";
import {
  submitProfile,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";
import {
  getImageUploadUrl,
  saveImageMeta,
  updateImageOrder,
} from "@/lib/utils/imageUtil";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  clearAllOnboardingData,
  STORAGE_KEYS,
} from "@/lib/utils/onboardingStorage";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import type { ImageType } from "@/types/image";
import { cmToFeetInches } from "@/lib/utils/height";

// Enhanced validation imports
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { SimpleProgress } from "@/components/ui/ProgressIndicator";
import { useStepValidation } from "@/hooks/useStepValidation";
import { stepSchemaMapping } from "@/lib/validation/profileValidation";

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
  const formData: ProfileCreationData = {
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

  console.log("ProfileCreationModal unified formData:", formData);

  // Step state is now only controlled by contextStep and navigation handlers
  // Ensure step is always a sane number between 1 and 7
  const step =
    Number.isFinite(contextStep) && contextStep >= 1 && contextStep <= 7
      ? contextStep
      : 1;
  const setStep = (newStep: number) => {
    const clamped = Math.max(1, Math.min(7, Math.floor(Number(newStep) || 1)));
    setContextStep(clamped);
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
    const normalizedHeight =
      typeof formData.height === "string" &&
      /^\d{2,3}$/.test(formData.height.trim())
        ? `${formData.height.trim()} cm`
        : formData.height;
    return { ...formData, height: normalizedHeight };
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
      // Clear all onboarding data from localStorage
      clearAllOnboardingData();

      // Reset the wizard context
      resetWizard();

      console.log("Profile creation modal closed - localStorage cleared");
    } catch (error) {
      console.error("Error clearing localStorage on modal close:", error);
    } finally {
      // Always call the original onClose
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
    (imgs: (string | ImageType)[]) => {
      // Always accept the images and update immediately
      const ids = imgs.map((img) => (typeof img === "string" ? img : img.id));

      // Update context immediately
      handleInputChange("profileImageIds", ids);

      // Store in localStorage for persistence using STORAGE_KEYS
      try {
        localStorage.setItem(STORAGE_KEYS.PENDING_IMAGES, JSON.stringify(ids));
      } catch (err) {
        console.warn("Unable to store images in localStorage", err);
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
      // Only show toast on explicit Next click; inline errors are visible
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

    // For step 2 (Location & Physical), ensure values conform before validation
    if (step === 2) {
      console.log("[Next][step2] pre-normalize start", {
        heightRaw: formData.height,
        cityRaw: formData.city,
        maritalStatus: formData.maritalStatus,
      });

      // Normalize height (store normalized for consistency)
      if (typeof formData.height === "string") {
        const raw = formData.height.trim();
        if (/^\d{2,3}$/.test(raw)) {
          handleInputChange("height", `${raw} cm`);
          console.log("[Next][step2] normalized height ->", `${raw} cm`);
        }
      }
      // Trim city
      if (typeof formData.city === "string") {
        const trimmedCity = formData.city.trim();
        if (trimmedCity !== formData.city) {
          handleInputChange("city", trimmedCity);
          console.log("[Next][step2] trimmed city ->", trimmedCity);
        }
      }

      // Force a tick to let context flush before validation
      await new Promise((r) => setTimeout(r, 0));
      console.log("[Next][step2] post-flush snapshot", {
        city: (document.getElementById("city") as HTMLInputElement | null)
          ?.value,
        height: formData.height,
        maritalStatus: formData.maritalStatus,
      });
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
        const missingOrder = ["city", "height", "maritalStatus"];
        for (const field of missingOrder) {
          const err = stepValidation.getFieldError(field);
          if (err) {
            console.log("[Next] focusing field with error:", field, err);
            const el = document.getElementById(field);
            if (el) {
              (el as HTMLElement).focus();
              break;
            }
          }
        }
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

    // Advance to next step; new mapping sets 3 = Cultural, 4 = Education, 5 = Preferences, 6 = Photos, 7 = Account
    if (step < 7) {
      const next = step + 1;
      console.log("[Next] advancing to step:", next);
      setStep(next);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Native authentication
  const { isAuthenticated, signOut } = useAuth();

  // Listen for authentication success (native auth doesn't use popups)
  // This effect is kept for potential future OAuth integrations
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our domain
      if (event.origin !== window.location.origin) return;

      // Check if it's an auth success message
      if (event.data?.type === "auth-success" && event.data?.isAuthenticated) {
        console.log("ProfileCreationModal: Received auth success message");
        // Refresh auth state
        window.location.reload();
      }
    };

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
            clearAllOnboardingData();
          } catch (err) {
            console.warn("Failed to clear onboarding data:", err);
          }
          showSuccessToast("Account created. Finalizing your profile...");
          handleClose();
          try {
            router.push("/success");
          } catch (err) {
            console.error("Failed to redirect to success page:", err);
            window.location.href = "/success";
          }
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

        // Validate only truly required fields before submission
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

        const missingFields = requiredFields.filter((field) => {
          const value = cleanedData[field];
          return !value || (typeof value === "string" && value.trim() === "");
        });

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

        // Normalize phone number to E.164-like format before submission
        const normalizeToE164 = (phone: unknown): string | null => {
          if (typeof phone !== "string") return null;
          const cleaned = phone.replace(/[^\d+]/g, "");
          const digits = cleaned.replace(/\D/g, "");
          if (digits.length >= 10 && digits.length <= 15) {
            return `+${digits}`;
          }
          return null;
        };

        const normalizedPhone =
          normalizeToE164(cleanedData.phoneNumber as string) ??
          (typeof cleanedData.phoneNumber === "string"
            ? cleanedData.phoneNumber
            : "");

        // Persist normalized phone back to context to keep state consistent
        try {
          if (normalizedPhone) {
            updateContextData({ phoneNumber: normalizedPhone });
          }
        } catch {}

        const payload: Partial<import("@/types/profile").ProfileFormValues> = {
          ...(cleanedData as unknown as import("@/types/profile").ProfileFormValues),
          profileFor: (cleanedData.profileFor ?? "self") as
            | "self"
            | "friend"
            | "family",
          dateOfBirth: String(cleanedData.dateOfBirth ?? ""),
          partnerPreferenceCity: Array.isArray(
            cleanedData.partnerPreferenceCity
          )
            ? (cleanedData.partnerPreferenceCity as string[])
            : [],
          email:
            // user?.primaryEmailAddress?.emailAddress || // Disabled for native auth
            (cleanedData.email as string) || "",
          phoneNumber: normalizedPhone,
        };

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
          const failedImages: { name: string; reason: string }[] = [];

          for (const img of pendingImages) {
            try {
              // Validate image before upload
              if (!img.url || !img.url.startsWith("blob:")) {
                const reason = "Invalid local image URL";
                console.warn(`${reason}, skipping:`, img);
                failedImages.push({
                  name: img.fileName || "photo.jpg",
                  reason,
                });
                continue;
              }

              // Fetch the blob from the object URL
              let blob: Blob;
              try {
                const resp = await fetch(img.url);
                if (!resp.ok) {
                  const reason = `Failed to read local image (${resp.status})`;
                  console.error(reason);
                  failedImages.push({
                    name: img.fileName || "photo.jpg",
                    reason,
                  });
                  continue;
                }
                blob = await resp.blob();
              } catch (e) {
                const reason = "Failed to read local image blob";
                console.error(reason, e);
                failedImages.push({
                  name: img.fileName || "photo.jpg",
                  reason,
                });
                continue;
              }

              // Validate file size (max 5MB)
              const MAX_SIZE = 5 * 1024 * 1024;
              if (blob.size > MAX_SIZE) {
                const reason = "Image exceeds 5MB";
                console.warn(reason, img.fileName);
                failedImages.push({
                  name: img.fileName || "photo.jpg",
                  reason,
                });
                continue;
              }

              // Derive a safe content type, default to jpeg if unknown/empty
              const safeType =
                blob.type &&
                ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
                  blob.type.toLowerCase()
                )
                  ? blob.type
                  : "image/jpeg";

              const file = new File([blob], img.fileName || "photo.jpg", {
                type: safeType,
              });

              // 1) Generate upload URL
              let uploadUrl: string | null = null;
              try {
                uploadUrl = await getImageUploadUrl(authToken);
              } catch (e) {
                const reason =
                  e instanceof Error ? e.message : "Failed to get upload URL";
                console.error("getImageUploadUrl error:", e);
                failedImages.push({ name: file.name, reason });
                continue;
              }
              if (!uploadUrl) {
                const reason = "Failed to get upload URL";
                console.error(reason);
                failedImages.push({ name: file.name, reason });
                continue;
              }

              // 2) Upload binary via POST and JSON-parse Convex response for storageId
              const uploadResp = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
              });

              if (!uploadResp.ok) {
                let errText = uploadResp.statusText;
                try {
                  errText = await uploadResp.text();
                } catch {}
                const reason = `Upload failed (${uploadResp.status})${errText ? `: ${errText}` : ""}`;
                console.error("Upload failed", uploadResp.status, errText);
                failedImages.push({ name: file.name, reason });
                continue;
              }

              // Convex returns JSON containing { storageId } (or string)
              let storageJson: unknown;
              try {
                storageJson = await uploadResp.json();
              } catch (e) {
                const reason = "Failed to parse upload response";
                console.error(reason, e);
                failedImages.push({ name: file.name, reason });
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
                console.error(reason);
                failedImages.push({ name: file.name, reason });
                continue;
              }

              // 3) Confirm metadata and capture imageId for ordering
              try {
                const meta = await saveImageMeta({
                  token: authToken,
                  userId,
                  storageId,
                  fileName: file.name,
                  contentType: file.type,
                  fileSize: file.size,
                });

                if (meta?.imageId) {
                  createdImageIds.push(meta.imageId);
                } else {
                  const reason = "Server did not return imageId";
                  console.error(reason);
                  failedImages.push({ name: file.name, reason });
                  continue;
                }
              } catch (e) {
                const message =
                  e instanceof Error
                    ? e.message
                    : "Failed to save image metadata";
                console.error("saveImageMeta error:", e);
                failedImages.push({ name: file.name, reason: message });
                continue;
              }

              uploadedCount++;
              console.log(
                `Successfully uploaded image ${uploadedCount}/${pendingImages.length}`
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : "Unknown image upload error";
              console.error("Image upload error for", img.fileName, ":", err);
              failedImages.push({
                name: img.fileName || "photo.jpg",
                reason: message,
              });
              // Continue with other images even if one fails
            }
          }

          // Show aggregated error toast if some images failed
          if (failedImages.length > 0) {
            const sample = failedImages
              .slice(0, 3)
              .map((f) => `${f.name}: ${f.reason}`)
              .join("; ");
            const extra =
              failedImages.length > 3
                ? `, and ${failedImages.length - 3} more`
                : "";
            showErrorToast(
              null,
              `Some images failed to upload (${failedImages.length}). ${sample}${extra}`
            );
          }

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
                await updateImageOrder({
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

        // Clean up all onboarding data
        try {
          clearAllOnboardingData();
        } catch (err) {
          console.warn("Failed to clear onboarding data:", err);
          // Don't block the success flow for this
        }

        // Mark completion flags locally to eliminate stale 'profile not created' toasts
        try {
          updateContextData({
            isProfileComplete: true,
            isOnboardingComplete: true,
          });
        } catch {}

        showSuccessToast("Profile created successfully!");
        handleClose();

        // Redirect to success page
        try {
          router.push("/success");
        } catch (err) {
          console.error("Failed to redirect to success page:", err);
          // Fallback: reload the page to ensure clean state
          window.location.href = "/success";
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
      clearAllOnboardingData();
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isOpen]);

  // Replace the existing normalizedOnOpenRef useEffect with this:

  // Normalize starting step once per open:
  // - If coming from Hero (hasBasicData), always start at 2
  // - If no basic data, always start at 1
  const normalizedOnOpenRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      normalizedOnOpenRef.current = false;
      return;
    }
    if (normalizedOnOpenRef.current) return;

    if (hasBasicData) {
      // Always set to step 2 when coming from Hero, regardless of current step
      setStep(2);
    } else {
      // Always set to step 1 when no basic data
      setStep(1);
    }
    normalizedOnOpenRef.current = true;
  }, [isOpen, hasBasicData]); // Remove 'step' from dependencies to avoid loops

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
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Basic Information
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tell us about yourself
                      </p>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="profileFor"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("This profile is for")}
                      </Label>
                      <Select
                        value={formData.profileFor}
                        onValueChange={(value) =>
                          handleInputChange("profileFor", value)
                        }
                      >
                        <SelectTrigger
                          id="profileFor"
                          className="w-full bg-white"
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="self">Myself</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="relative">Relative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-6">
                      <Label className="text-gray-700 mb-2 block">
                        {required("Gender")}
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={
                            formData.gender === "male" ? "default" : "outline"
                          }
                          className={`w-full ${
                            formData.gender === "male"
                              ? "bg-pink-600 hover:bg-pink-700"
                              : ""
                          }`}
                          onClick={() => handleInputChange("gender", "male")}
                        >
                          Male
                        </Button>
                        <Button
                          type="button"
                          variant={
                            formData.gender === "female" ? "default" : "outline"
                          }
                          className={`w-full ${
                            formData.gender === "female"
                              ? "bg-pink-600 hover:bg-pink-700"
                              : ""
                          }`}
                          onClick={() => handleInputChange("gender", "female")}
                        >
                          Female
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Location & Physical */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* Country - Optional */}
                    <div>
                      <Label
                        htmlFor="country"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Country")}
                      </Label>
                      <SearchableSelect
                        options={countries.map((c) => ({
                          value: c,
                          label: c,
                        }))}
                        value={formData.country}
                        onValueChange={(v) => handleInputChange("country", v)}
                        placeholder="Select country"
                        aria-invalid={!!errors.country}
                        aria-describedby={
                          errors.country ? "country-error" : undefined
                        }
                      />
                    </div>

                    {/* City - Required */}

                    <ValidatedInput
                      label="City"
                      field="city"
                      step={step}
                      value={formData.city}
                      onValueChange={(v) => handleInputChange("city", v)}
                      placeholder="Enter your city"
                      required
                      hint="Enter the city where you currently live"
                    />

                    {/* Height - Required with validated highlight */}
                    <div>
                      <Label
                        htmlFor="height"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Height")}
                      </Label>
                      <div
                        className={`rounded-md ${
                          formData.height
                            ? "ring-1 ring-green-500 border-green-500"
                            : stepValidation.getFieldError("height")
                              ? "ring-1 ring-red-500 border-red-500"
                              : ""
                        }`}
                      >
                        <SearchableSelect
                          options={Array.from(
                            { length: 198 - 137 + 1 },
                            (_, i) => {
                              const cm = 137 + i;
                              const normalized = `${cm} cm`;
                              return {
                                value: normalized,
                                label: `${cmToFeetInches(cm)} (${cm} cm)`,
                              };
                            }
                          )}
                          value={
                            typeof formData.height === "string" &&
                            /^\d{2,3}$/.test(formData.height.trim())
                              ? `${formData.height.trim()} cm`
                              : formData.height
                          }
                          onValueChange={(v) => {
                            // Always store normalized "<cm> cm"
                            const normalized =
                              typeof v === "string"
                                ? /^\d{2,3}$/.test(v.trim())
                                  ? `${v.trim()} cm`
                                  : v
                                : v;
                            handleInputChange("height", normalized as string);
                            // Proactively clear height error once a valid selection is made
                            // by triggering a revalidation of current step snapshot
                            void stepValidation.validateCurrentStep();
                          }}
                          placeholder="Select height"
                          className="bg-white"
                        />
                      </div>
                      {/* {stepValidation.getFieldError("height") ? (
                        <div className="flex items-center space-x-1 text-sm text-red-600 mt-1">
                          <span>{stepValidation.getFieldError("height")}</span>
                        </div>
                      ) : null} */}
                    </div>

                    {/* Marital Status - Required */}
                    <ValidatedSelect
                      label="Marital Status"
                      field="maritalStatus"
                      className="bg-white text-black"
                      step={step}
                      value={formData.maritalStatus}
                      onValueChange={(v) =>
                        handleInputChange("maritalStatus", v)
                      }
                      options={[
                        { value: "single", label: "Single" },
                        { value: "divorced", label: "Divorced" },
                        { value: "widowed", label: "Widowed" },
                        { value: "annulled", label: "Annulled" },
                      ]}
                      placeholder="Select marital status"
                      required
                    />

                    {/* Physical Status - Optional */}
                    <ValidatedSelect
                      label="Physical Status"
                      field="physicalStatus"
                      step={step}
                      value={formData.physicalStatus}
                      onValueChange={(v) =>
                        handleInputChange("physicalStatus", v)
                      }
                      options={[
                        { value: "normal", label: "Normal" },
                        {
                          value: "differently-abled",
                          label: "Differently Abled",
                        },
                        // { value: "other", label: "Other" },
                      ]}
                      placeholder="Select physical status"
                    />
                  </div>
                )}

                {/* Step 3: Cultural & Lifestyle (moved earlier from previous step 4) */}
                {step === 3 && (
                  <div className="space-y-6">
                    {/* Mother Tongue - Optional with validated highlight */}
                    <div>
                      <Label
                        htmlFor="motherTongue"
                        className="text-gray-700 mb-2 block"
                      >
                        Mother Tongue
                      </Label>
                      <div
                        className={`rounded-md ${
                          formData.motherTongue
                            ? "ring-1 ring-green-500 border-green-500"
                            : stepValidation.getFieldError("motherTongue")
                              ? "ring-1 ring-red-500 border-red-500"
                              : ""
                        }`}
                      >
                        <ValidatedSelect
                          label=""
                          field="motherTongue"
                          step={step}
                          value={formData.motherTongue}
                          onValueChange={(v) =>
                            handleInputChange("motherTongue", v)
                          }
                          options={MOTHER_TONGUE_OPTIONS.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                          placeholder="Select language"
                          className="bg-white"
                        />
                      </div>
                      {stepValidation.getFieldError("motherTongue") ? (
                        <div className="flex items-center space-x-1 text-sm text-red-600 mt-1">
                          <span>
                            {stepValidation.getFieldError("motherTongue")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Religion - Optional with validated highlight */}
                    <div>
                      <Label
                        htmlFor="religion"
                        className="text-gray-700 mb-2 block"
                      >
                        Religion
                      </Label>
                      <div
                        className={`rounded-md ${
                          formData.religion
                            ? "ring-1 ring-green-500 border-green-500"
                            : stepValidation.getFieldError("religion")
                              ? "ring-1 ring-red-500 border-red-500"
                              : ""
                        }`}
                      >
                        <ValidatedSelect
                          label=""
                          field="religion"
                          step={step}
                          value={formData.religion}
                          onValueChange={(v) =>
                            handleInputChange("religion", v)
                          }
                          options={RELIGION_OPTIONS.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                          placeholder="Select religion"
                          className="bg-white"
                        />
                      </div>
                      {stepValidation.getFieldError("religion") ? (
                        <div className="flex items-center space-x-1 text-sm text-red-600 mt-1">
                          <span>
                            {stepValidation.getFieldError("religion")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Ethnicity - Optional with validated highlight */}
                    <div>
                      <Label
                        htmlFor="ethnicity"
                        className="text-gray-700 mb-2 block"
                      >
                        Ethnicity
                      </Label>

                      <div
                        className={`rounded-md ${
                          formData.ethnicity
                            ? "ring-1 ring-green-500 border-green-500"
                            : stepValidation.getFieldError("ethnicity")
                              ? "ring-1 ring-red-500 border-red-500"
                              : ""
                        }`}
                      >
                        <ValidatedSelect
                          label=""
                          field="ethnicity"
                          step={step}
                          value={formData.ethnicity}
                          onValueChange={(v) =>
                            handleInputChange("ethnicity", v)
                          }
                          options={ETHNICITY_OPTIONS.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                          placeholder="Select ethnicity"
                          className="bg-white"
                        />
                      </div>
                      {stepValidation.getFieldError("ethnicity") ? (
                        <div className="flex items-center space-x-1 text-sm text-red-600 mt-1">
                          <span>
                            {stepValidation.getFieldError("ethnicity")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <ValidatedSelect
                      label="Diet"
                      field="diet"
                      step={step}
                      value={formData.diet}
                      onValueChange={(v) => handleInputChange("diet", v)}
                      options={[
                        { value: "vegetarian", label: "Vegetarian" },
                        { value: "non-vegetarian", label: "Non-Vegetarian" },
                        { value: "halal", label: "Halal Only" },
                        { value: "other", label: "Other" },
                      ]}
                      placeholder="Select diet preference"
                    />

                    <ValidatedSelect
                      label="Smoking"
                      field="smoking"
                      step={step}
                      value={formData.smoking}
                      onValueChange={(v) => handleInputChange("smoking", v)}
                      options={[
                        { value: "no", label: "No" },
                        { value: "occasionally", label: "Occasionally" },
                        { value: "yes", label: "Yes" },
                      ]}
                      placeholder="Select smoking preference"
                    />

                    <ValidatedSelect
                      label="Drinking"
                      field="drinking"
                      step={step}
                      value={formData.drinking}
                      onValueChange={(v) => handleInputChange("drinking", v)}
                      options={[
                        { value: "no", label: "No" },
                        { value: "occasionally", label: "Occasionally" },
                        { value: "yes", label: "Yes" },
                      ]}
                      placeholder="Select drinking preference"
                    />
                  </div>
                )}

                {/* Step 4: Education & Career (was step 5) */}
                {step === 4 && (
                  <div className="space-y-6">
                    <ValidatedInput
                      label="Education"
                      field="education"
                      step={step}
                      value={formData.education}
                      onValueChange={(v) => handleInputChange("education", v)}
                      placeholder="e.g. Bachelor's, Master's"
                      required
                    />

                    <ValidatedInput
                      label="Occupation"
                      field="occupation"
                      step={step}
                      value={formData.occupation}
                      onValueChange={(v) => handleInputChange("occupation", v)}
                      placeholder="Occupation"
                      required
                    />

                    <ValidatedInput
                      label="Annual Income"
                      field="annualIncome"
                      step={step}
                      value={formData.annualIncome}
                      onValueChange={(v) =>
                        handleInputChange("annualIncome", v)
                      }
                      placeholder="e.g. £30,000"
                    />

                    <ValidatedTextarea
                      label="About Me"
                      field="aboutMe"
                      step={step}
                      value={formData.aboutMe}
                      onValueChange={(v) => handleInputChange("aboutMe", v)}
                      placeholder="Tell us a little about yourself..."
                      rows={4}
                      required
                    />
                  </div>
                )}

                {/* Step 5: Partner Preferences (was step 6) */}
                {step === 5 && (
                  <div className="space-y-6">
                    <ValidatedSelect
                      label="Preferred Gender"
                      field="preferredGender"
                      step={step}
                      value={formData.preferredGender}
                      onValueChange={(v) =>
                        handleInputChange("preferredGender", v)
                      }
                      options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "any", label: "Any" },
                        { value: "other", label: "Other" },
                      ]}
                      placeholder="Select preferred gender"
                      required
                    />

                    <div>
                      <Label className="text-gray-700 mb-2 block">
                        Age Range
                      </Label>
                      <div className="flex gap-2 items-center">
                        <ValidatedInput
                          label="Min"
                          field="partnerPreferenceAgeMin"
                          step={step}
                          value={
                            formData.partnerPreferenceAgeMin !== undefined
                              ? String(formData.partnerPreferenceAgeMin)
                              : ""
                          }
                          type="number"
                          onValueChange={(v) =>
                            handleInputChange(
                              "partnerPreferenceAgeMin",
                              v === "" ? "" : Number(v)
                            )
                          }
                          className="w-24"
                          placeholder="18"
                        />
                        <span>to</span>
                        <ValidatedInput
                          label="Max"
                          field="partnerPreferenceAgeMax"
                          step={step}
                          value={
                            formData.partnerPreferenceAgeMax !== undefined
                              ? String(formData.partnerPreferenceAgeMax)
                              : ""
                          }
                          type="number"
                          onValueChange={(v) =>
                            handleInputChange(
                              "partnerPreferenceAgeMax",
                              v === "" ? "" : Number(v)
                            )
                          }
                          className="w-24"
                          placeholder="99"
                        />
                      </div>
                    </div>

                    <ValidatedInput
                      label="Preferred Cities"
                      field="partnerPreferenceCity"
                      step={step}
                      value={preferredCitiesInput}
                      onValueChange={(raw) => {
                        setPreferredCitiesInput(String(raw));
                        const parsed = String(raw)
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        handleInputChange("partnerPreferenceCity", parsed);
                      }}
                      placeholder="e.g. London, Kabul"
                      hint="Comma-separated list"
                    />
                  </div>
                )}

                {/* Step 6: Photos (Optional) (was step 7) */}
                {step === 6 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Profile Photos
                      </h3>
                      <p className="text-sm text-gray-600">
                        Add photos to your profile (optional)
                      </p>
                    </div>
                    <div className="mb-6">
                      <Label className="text-gray-700 mb-2 block">
                        Profile Photos
                      </Label>
                      <LocalImageUpload
                        onImagesChanged={handleProfileImagesChange}
                        className="w-full h-48"
                      />
                    </div>
                  </div>
                )}

                {/* Step 7: Account Creation (was step 8) */}
                {step === 7 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Create Account
                      </h3>
                      <p className="text-sm text-gray-600">
                        Finish and create your account
                      </p>
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const requiredFields = [
                          "fullName",
                          "dateOfBirth",
                          "gender",
                          "city",
                          "aboutMe",
                          "occupation",
                          "education",
                          "height",
                          "maritalStatus",
                          "phoneNumber",
                        ];
                        const missingFields = requiredFields.filter((field) => {
                          const value =
                            formData[field as keyof ProfileCreationData];
                          return (
                            !value ||
                            (typeof value === "string" && value.trim() === "")
                          );
                        });

                        if (missingFields.length > 0) {
                          return (
                            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-red-600 font-semibold mb-2">
                                ⚠️ Cannot create account - Profile incomplete
                              </p>
                              <p className="text-sm text-red-500 mb-4">
                                You must complete all profile sections before
                                creating an account.
                              </p>
                              <p className="text-xs text-red-400 mb-4">
                                Missing: {missingFields.slice(0, 5).join(", ")}
                                {missingFields.length > 5 &&
                                  ` and ${missingFields.length - 5} more fields`}
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Go back to complete profile
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Use the centralized CustomSignupForm for account creation */}
                            <CustomSignupForm
                              onComplete={() => router.push("/success")}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
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
