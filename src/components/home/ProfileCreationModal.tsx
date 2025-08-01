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
import { getImageUploadUrl, saveImageMeta } from "@/lib/utils/imageUtil";
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

  // Total number of steps - always 8 steps including account creation
  const totalSteps = 8;

  // Create a unified formData object from context data and initial data
  const formData: ProfileCreationData = {
    profileFor:
      (contextData?.profileFor as string) || initialData?.profileFor || "",
    gender: (contextData?.gender as string) || initialData?.gender || "",
    fullName: (contextData?.fullName as string) || initialData?.fullName || "",
    dateOfBirth:
      (contextData?.dateOfBirth as string) || initialData?.dateOfBirth || "",
    email: (contextData?.email as string) || initialData?.email || "",
    phoneNumber:
      (contextData?.phoneNumber as string) || initialData?.phoneNumber || "",
    country: (contextData?.country as string) || initialData?.country || "",
    city: (contextData?.city as string) || initialData?.city || "",
    height: (contextData?.height as string) || initialData?.height || "",
    maritalStatus:
      (contextData?.maritalStatus as string) ||
      initialData?.maritalStatus ||
      "",
    physicalStatus:
      (contextData?.physicalStatus as string) ||
      initialData?.physicalStatus ||
      "",
    motherTongue:
      (contextData?.motherTongue as string) || initialData?.motherTongue || "",
    religion: (contextData?.religion as string) || initialData?.religion || "",
    ethnicity:
      (contextData?.ethnicity as string) || initialData?.ethnicity || "",
    diet: (contextData?.diet as string) || initialData?.diet || "",
    smoking: (contextData?.smoking as string) || initialData?.smoking || "",
    drinking: (contextData?.drinking as string) || initialData?.drinking || "",
    education:
      (contextData?.education as string) || initialData?.education || "",
    occupation:
      (contextData?.occupation as string) || initialData?.occupation || "",
    annualIncome:
      (contextData?.annualIncome as string) || initialData?.annualIncome || "",
    aboutMe: (contextData?.aboutMe as string) || initialData?.aboutMe || "",
    preferredGender:
      (contextData?.preferredGender as string) ||
      initialData?.preferredGender ||
      "",
    partnerPreferenceAgeMin:
      (contextData?.partnerPreferenceAgeMin as number) ||
      initialData?.partnerPreferenceAgeMin ||
      18,
    partnerPreferenceAgeMax:
      (contextData?.partnerPreferenceAgeMax as number) ||
      initialData?.partnerPreferenceAgeMax,
    partnerPreferenceCity:
      (contextData?.partnerPreferenceCity as string[]) ||
      initialData?.partnerPreferenceCity ||
      [],
    profileImageIds:
      (contextData?.profileImageIds as string[]) ||
      initialData?.profileImageIds ||
      [],
  };

  console.log("ProfileCreationModal unified formData:", formData);

  // Check if location data is complete
  const hasLocationData = Boolean(
    contextData?.city && contextData?.height && contextData?.maritalStatus
  );

  // Determine the starting step based on whether we have basic data
  const startingStep = hasBasicData ? 2 : 1;

  // Initialize the step correctly when modal opens
  // If contextStep is 1 (default) and we have basic data, start at step 2
  // Otherwise, use the context step but ensure it's not below the starting step
  // However, if we have basic data but no location data, ensure we start at step 2
  let step = contextStep;
  if (hasBasicData && !hasLocationData) {
    // If we have basic data but no location data, ensure we start at step 2
    step = 2;
  } else if (contextStep === 1 && hasBasicData) {
    step = startingStep;
  } else {
    step = Math.max(contextStep, startingStep);
  }
  const setStep = (newStep: number) => {
    // If we have basic data but no location data, don't allow skipping step 2
    if (hasBasicData && !hasLocationData && newStep > 2) {
      setContextStep(2);
    } else {
      // Ensure we never go below the starting step
      setContextStep(Math.max(newStep, startingStep));
    }
  };

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
  const stepValidation = useStepValidation({
    step,
    data: formData,
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
      showErrorToast(null, summary.summary);
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (!(await validateStep())) return;

    // Step 1: HeroOnboarding required fields
    if (step === 1) {
      const heroRequiredFields = [
        "profileFor",
        "gender",
        "fullName",
        "dateOfBirth",
        "phoneNumber",
      ];
      const missingHeroFields = heroRequiredFields.filter((field) => {
        const value = formData[field as keyof ProfileCreationData];
        return !value || (typeof value === "string" && value.trim() === "");
      });
      if (missingHeroFields.length > 0) {
        const missingList = missingHeroFields.map((field) => {
          return field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
        });
        showErrorToast(
          null,
          `Please complete all required fields in Basic Information.\nMissing: ${missingList.join(", ")}`
        );
        console.error(
          "Cannot proceed - missing HeroOnboarding fields:",
          missingHeroFields
        );
        return;
      }
    }

    // Additional validation before moving to sign-up step
    // This should happen when we're at the last step before account creation
    if (step === totalSteps - 1) {
      // Validate only essential required fields are present before moving to sign-up
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
        const value = formData[field as keyof ProfileCreationData];
        return !value || (typeof value === "string" && value.trim() === "");
      });

      if (missingFields.length > 0) {
        const missingList = missingFields.map((field) => {
          return field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
        });
        showErrorToast(
          null,
          `Please complete all required fields before creating account.\nMissing: ${missingList.join(", ")}`
        );
        console.error(
          "Cannot proceed to sign-up - missing fields:",
          missingFields
        );
        return;
      }
    }

    if (step < totalSteps) setStep(step + 1);
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

  // Advance wizard automatically when OAuth completes
  useEffect(() => {
    if (isAuthenticated && step === 8) {
      // User is signed in, profile submission will happen automatically
      console.log("User signed in at step 8, profile will be submitted");
    }
  }, [isAuthenticated, step]);

  // -------- Auto submit profile & images when user is signed in --------
  useEffect(() => {
    const submitProfileAndImages = async () => {
      if (!isAuthenticated) return;
      if (hasSubmittedProfile) return; // guard
      if (isSubmitting) return; // prevent double submission

      // Only submit if we're on the final step
      if (step !== 8) {
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
        // Check for existing profile – do NOT allow update via modal
        const existing = await getCurrentUserWithProfile(authToken);
        if (existing.success && existing.data) {
          console.log("Profile already exists");
          showErrorToast(
            null,
            "A profile already exists for this account. Please use the profile edit feature instead."
          );
          setHasSubmittedProfile(false);
          // Clear any stale onboarding data
          clearAllOnboardingData();
          // Close the modal
          handleClose();
          return;
        }

        // Mark as submitted after passing duplicate check
        setHasSubmittedProfile(true);

        // Simply use the current formData which already contains all the data
        // The formData state was initialized with initialData and has been updated throughout the wizard
        const merged: Record<string, unknown> = formData as unknown as Record<
          string,
          unknown
        >;

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

          for (const img of pendingImages) {
            try {
              // Validate image before upload
              if (!img.url || !img.url.startsWith("blob:")) {
                console.warn("Invalid image URL, skipping:", img);
                continue;
              }

              // Fetch the blob from the object URL
              const blob = await fetch(img.url).then((r) => r.blob());

              // Validate file size (max 5MB)
              if (blob.size > 5 * 1024 * 1024) {
                console.warn("Image too large, skipping:", img.fileName);
                continue;
              }

              const file = new File([blob], img.fileName || "photo.jpg", {
                type: blob.type || "image/jpeg",
              });

              const uploadUrl = await getImageUploadUrl(authToken);
              if (!uploadUrl) {
                console.error("Failed to get upload URL");
                continue;
              }

              const uploadResp = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
              });

              if (!uploadResp.ok) {
                console.error("Upload failed", uploadResp.statusText);
                continue;
              }

              const json = await uploadResp.json();
              const storageId =
                json?.storageId || (typeof json === "string" ? json : null);

              if (!storageId) {
                console.error("No storage ID returned from upload");
                continue;
              }

              await saveImageMeta({
                token: authToken,
                userId,
                storageId,
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
              });

              uploadedCount++;
              console.log(
                `Successfully uploaded image ${uploadedCount}/${pendingImages.length}`
              );
            } catch (err) {
              console.error("Image upload error for", img.fileName, ":", err);
              // Continue with other images even if one fails
            }
          }

          if (uploadedCount > 0) {
            console.log(
              `Successfully uploaded ${uploadedCount} out of ${pendingImages.length} images`
            );
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
          if (
            err.message.includes("network") ||
            err.message.includes("fetch")
          ) {
            errorMessage =
              "Network error. Please check your connection and try again.";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Request timed out. Please try again.";
          } else if (
            err.message.includes("401") ||
            err.message.includes("unauthorized")
          ) {
            errorMessage = "Authentication expired. Please sign in again.";
          } else if (
            err.message.includes("409") ||
            err.message.includes("duplicate")
          ) {
            errorMessage =
              "Profile already exists. Please use the profile edit feature.";
          } else if (
            err.message.includes("400") ||
            err.message.includes("validation")
          ) {
            errorMessage =
              "Invalid profile data. Please check your information and try again.";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden bg-white sm:max-h-[90vh] max-h-screen sm:rounded-lg rounded-none"
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
            <div className="mt-4">
              <SimpleProgress current={step} total={totalSteps} />
            </div>
          </DialogHeader>

          <div className="p-6">
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

                {/* Step 2: Location */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Location Information
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tell us where you're located
                      </p>
                    </div>

                    {/* Country - Required */}
                    <div className="mb-6">
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
                    <div className="mb-6">
                      <Label
                        htmlFor="city"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("City")}
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        placeholder="Enter your city"
                        required
                        aria-invalid={!!errors.city}
                        aria-describedby={
                          errors.city ? "city-error" : undefined
                        }
                      />
                    </div>

                    {/* Height - Required */}
                    <div className="mb-6">
                      <Label
                        htmlFor="height"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Height")}
                      </Label>
                      <SearchableSelect
                        options={Array.from(
                          { length: 198 - 137 + 1 },
                          (_, i) => {
                            const cm = 137 + i;
                            return {
                              value: String(cm),
                              label: `${cmToFeetInches(cm)} (${cm} cm)`,
                            };
                          }
                        )}
                        value={formData.height}
                        onValueChange={(v) => handleInputChange("height", v)}
                        placeholder="Select height"
                        aria-invalid={!!errors.height}
                        aria-describedby={
                          errors.height ? "height-error" : undefined
                        }
                      />
                    </div>

                    {/* Marital Status - Required */}
                    <div className="mb-6">
                      <Label
                        htmlFor="maritalStatus"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Marital Status")}
                      </Label>
                      <SearchableSelect
                        options={[
                          { value: "single", label: "Single" },
                          { value: "divorced", label: "Divorced" },
                          { value: "widowed", label: "Widowed" },
                          { value: "annulled", label: "Annulled" },
                        ]}
                        value={formData.maritalStatus}
                        onValueChange={(v) =>
                          handleInputChange("maritalStatus", v)
                        }
                        placeholder="Select marital status"
                        aria-invalid={!!errors.maritalStatus}
                        aria-describedby={
                          errors.maritalStatus
                            ? "maritalStatus-error"
                            : undefined
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Physical Information */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Physical Information
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tell us about your physical attributes
                      </p>
                    </div>

                    {/* Height - Required */}
                    <div className="mb-6">
                      <Label
                        htmlFor="height"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Height")}
                      </Label>
                      <SearchableSelect
                        options={Array.from(
                          { length: 198 - 137 + 1 },
                          (_, i) => {
                            const cm = 137 + i;
                            return {
                              value: String(cm),
                              label: `${cmToFeetInches(cm)} (${cm} cm)`,
                            };
                          }
                        )}
                        value={formData.height}
                        onValueChange={(v) => handleInputChange("height", v)}
                        placeholder="Select height"
                        aria-invalid={!!errors.height}
                        aria-describedby={
                          errors.height ? "height-error" : undefined
                        }
                      />
                    </div>

                    {/* Marital Status - Required */}
                    <div className="mb-6">
                      <Label
                        htmlFor="maritalStatus"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Marital Status")}
                      </Label>
                      <SearchableSelect
                        options={[
                          { value: "single", label: "Single" },
                          { value: "divorced", label: "Divorced" },
                          { value: "widowed", label: "Widowed" },
                          { value: "annulled", label: "Annulled" },
                        ]}
                        value={formData.maritalStatus}
                        onValueChange={(v) =>
                          handleInputChange("maritalStatus", v)
                        }
                        placeholder="Select marital status"
                        aria-invalid={!!errors.maritalStatus}
                        aria-describedby={
                          errors.maritalStatus
                            ? "maritalStatus-error"
                            : undefined
                        }
                      />
                    </div>

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
                          label: "Differently-abled",
                        },
                        { value: "other", label: "Other" },
                      ]}
                      placeholder="Select physical status"
                    />
                  </div>
                )}

                {/* Step 3: Physical Information */}

                {/* Step 4: Cultural & Lifestyle */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cultural & Lifestyle
                      </h3>
                      <p className="text-sm text-gray-600">
                        Share your background and lifestyle preferences
                      </p>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="motherTongue"
                        className="text-gray-700 mb-2 block"
                      >
                        Mother Tongue
                      </Label>
                      <SearchableSelect
                        options={MOTHER_TONGUE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        value={formData.motherTongue}
                        onValueChange={(v) =>
                          handleInputChange("motherTongue", v)
                        }
                        placeholder="Select language"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="religion"
                        className="text-gray-700 mb-2 block"
                      >
                        Religion
                      </Label>
                      <SearchableSelect
                        options={RELIGION_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        value={formData.religion}
                        onValueChange={(v) => handleInputChange("religion", v)}
                        placeholder="Select religion"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="ethnicity"
                        className="text-gray-700 mb-2 block"
                      >
                        Ethnicity
                      </Label>
                      <SearchableSelect
                        options={ETHNICITY_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        value={formData.ethnicity}
                        onValueChange={(v) => handleInputChange("ethnicity", v)}
                        placeholder="Select ethnicity"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="diet"
                        className="text-gray-700 mb-2 block"
                      >
                        Diet
                      </Label>
                      <Select
                        value={formData.diet}
                        onValueChange={(v) => handleInputChange("diet", v)}
                      >
                        <SelectTrigger id="diet" className="w-full bg-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="non-vegetarian">
                            Non-Vegetarian
                          </SelectItem>
                          <SelectItem value="halal">Halal Only</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="smoking"
                        className="text-gray-700 mb-2 block"
                      >
                        Smoking
                      </Label>
                      <Select
                        value={formData.smoking}
                        onValueChange={(v) => handleInputChange("smoking", v)}
                      >
                        <SelectTrigger id="smoking" className="w-full bg-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="occasionally">
                            Occasionally
                          </SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="drinking"
                        className="text-gray-700 mb-2 block"
                      >
                        Drinking
                      </Label>
                      <Select
                        value={formData.drinking}
                        onValueChange={(v) => handleInputChange("drinking", v)}
                      >
                        <SelectTrigger
                          id="drinking"
                          className="w-full bg-white"
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="occasionally">
                            Occasionally
                          </SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 5: Education & Career */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Education & Career
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tell us about your education and career
                      </p>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="education"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Education")}
                      </Label>
                      <Input
                        id="education"
                        value={formData.education}
                        onChange={(e) =>
                          handleInputChange("education", e.target.value)
                        }
                        placeholder="e.g. Bachelor's, Master's"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="occupation"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Occupation")}
                      </Label>
                      <Input
                        id="occupation"
                        value={formData.occupation}
                        onChange={(e) =>
                          handleInputChange("occupation", e.target.value)
                        }
                        placeholder="Occupation"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="annualIncome"
                        className="text-gray-700 mb-2 block"
                      >
                        Annual Income
                      </Label>
                      <Input
                        id="annualIncome"
                        value={formData.annualIncome}
                        onChange={(e) =>
                          handleInputChange("annualIncome", e.target.value)
                        }
                        placeholder="e.g. £30,000"
                      />
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="aboutMe"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("About Me")}
                      </Label>
                      <Textarea
                        id="aboutMe"
                        value={formData.aboutMe}
                        onChange={(e) =>
                          handleInputChange("aboutMe", e.target.value)
                        }
                        placeholder="Tell us a little about yourself..."
                        rows={4}
                        className="w-full bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Partner Preferences */}
                {step === 6 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Partner Preferences
                      </h3>
                      <p className="text-sm text-gray-600">
                        Describe your ideal partner
                      </p>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="preferredGender"
                        className="text-gray-700 mb-2 block"
                      >
                        {required("Preferred Gender")}
                      </Label>
                      <Select
                        value={formData.preferredGender}
                        onValueChange={(v) =>
                          handleInputChange("preferredGender", v)
                        }
                      >
                        <SelectTrigger
                          id="preferredGender"
                          className="w-full bg-white"
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mb-6">
                      <Label className="text-gray-700 mb-2 block">
                        Age Range
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={18}
                          max={99}
                          value={
                            formData.partnerPreferenceAgeMin !== undefined
                              ? String(formData.partnerPreferenceAgeMin)
                              : ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "partnerPreferenceAgeMin",
                              Number(e.target.value)
                            )
                          }
                          className="w-20"
                        />
                        <span>to</span>
                        <Input
                          type="number"
                          min={18}
                          max={99}
                          value={
                            formData.partnerPreferenceAgeMax !== undefined
                              ? String(formData.partnerPreferenceAgeMax)
                              : ""
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "partnerPreferenceAgeMax",
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                          className="w-20"
                        />
                      </div>
                    </div>
                    <div className="mb-6">
                      <Label
                        htmlFor="partnerPreferenceCity"
                        className="text-gray-700 mb-2 block"
                      >
                        Preferred Cities
                      </Label>
                      <Input
                        id="partnerPreferenceCity"
                        value={preferredCitiesInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setPreferredCitiesInput(raw);
                          const parsed = raw
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          handleInputChange("partnerPreferenceCity", parsed);
                        }}
                        placeholder="e.g. London, Kabul"
                      />
                    </div>
                  </div>
                )}

                {/* Step 7: Photos (Optional) */}
                {step === 7 && (
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

                {/* Step 8: Account Creation */}
                {step === 8 && (
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
                      <h3 className="text-lg font-semibold text-center">
                        Create your account
                      </h3>
                      {/* Final validation guard before showing signup form */}
                      {(() => {
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
                          <CustomSignupForm
                            onComplete={() => {
                              console.log(
                                "Signup completed; profile submission will auto-run"
                              );
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between items-center sticky bottom-0 bg-white p-4 z-10 border-t border-gray-100 shadow-sm">
              {/* Back Button - Show for all steps except first step */}
              {step > 1 && (
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
              {step === 1 && <div />}

              {/* Next Button - Show for all steps except final step */}
              {step < totalSteps && (
                <Button
                  onClick={handleNext}
                  disabled={stepValidation.isValidating}
                  className="bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 flex items-center gap-2"
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
