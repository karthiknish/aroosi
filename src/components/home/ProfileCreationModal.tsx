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
// import { useUser, useClerk } from "@clerk/nextjs"; // Removed for native auth
import { useAuth } from "@/components/AuthProvider";
import * as z from "zod";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import { COUNTRIES } from "@/lib/constants/countries";
import CustomSignupForm from "@/components/auth/CustomSignupForm";
// useAuthContext removed as it's not used
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
}

interface ProfileCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ProfileCreationData>;
}

// Zod schema for all fields - only truly required fields are mandatory
const profileSchema = z.object({
  // Required fields (as per API)
  profileFor: z.string().min(1, "Profile for is required"),
  gender: z.string().min(1, "Gender is required"),
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(7, "Phone number is required"),
  city: z.string().min(1, "City is required"),
  height: z.string().min(1, "Height is required"),
  maritalStatus: z.string().min(1, "Marital status is required"),
  education: z.string().min(1, "Education is required"),
  occupation: z.string().min(1, "Occupation is required"),
  aboutMe: z.string().min(10, "About Me is required"),
  preferredGender: z.string().min(1, "Preferred gender is required"),

  // Optional fields
  country: z.string().optional(),
  physicalStatus: z.string().optional(),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  diet: z.string().optional(),
  smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  drinking: z.string().optional(),
  annualIncome: z.string().optional(),
  partnerPreferenceAgeMin: z.number().min(18, "Min age 18").optional(),
  partnerPreferenceAgeMax: z.number().max(99, "Max age 99").optional(),
  partnerPreferenceCity: z.array(z.string()).optional(),
  profileImageIds: z.array(z.string()).optional(),
});

// Validation schemas aligned with visible steps
const stepSchemas = [
  // Step 1 – Basic (shown only when not supplied from onboarding)
  profileSchema.pick({
    profileFor: true,
    gender: true,
  }),
  // Step 2 – Location & Physical (city, height, maritalStatus are required)
  z.object({
    country: z.string().optional(),
    city: z.string().min(1, "City is required"),
    height: z.string().min(1, "Height is required"),
    maritalStatus: z.string().min(1, "Marital status is required"),
    physicalStatus: z.string().optional(),
  }),
  // Step 3 – Cultural & Lifestyle (all optional)
  z.object({
    motherTongue: z.string().optional(),
    religion: z.string().optional(),
    ethnicity: z.string().optional(),
    diet: z.string().optional(),
    smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
    drinking: z.string().optional(),
  }),
  // Step 4 – Education & Career (education, occupation, aboutMe are required)
  z.object({
    education: z.string().min(1, "Education is required"),
    occupation: z.string().min(1, "Occupation is required"),
    annualIncome: z.string().optional(),
    aboutMe: z.string().min(10, "About Me must be at least 10 characters"),
  }),
  // Step 5 – Partner Preferences (preferredGender is required)
  z.object({
    preferredGender: z.string().min(1, "Preferred gender is required"),
    partnerPreferenceAgeMin: z
      .number()
      .min(18, "Minimum age must be at least 18")
      .optional(),
    partnerPreferenceAgeMax: z
      .number()
      .max(99, "Maximum age cannot exceed 99")
      .optional(),
    partnerPreferenceCity: z.array(z.string()).optional(),
  }),
  // Step 6 – Photos (optional)
  z.object({
    profileImageIds: z.array(z.string()).optional(),
  }),
  // Step 7 – Account Creation (handled by CustomSignupForm)
  z.object({
    email: z.string().email("Valid email is required").optional(),
  }),
];

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

  // Total number of steps adjusts when we skip the duplicate first step
  const totalSteps = hasBasicData ? 6 : 7;

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

  // Use the context step directly, but adjust for modal display
  const step = contextStep;
  const setStep = setContextStep;

  // Calculate the actual step to display based on whether we have basic data
  // If we have basic data from HeroOnboarding, we start from step 2 (Location & Physical)
  // Otherwise, we start from step 1 (Basic Info)
  const displayStep = hasBasicData ? Math.max(step, 2) : step;

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Use only the setter; the value isn't required yet
  const [pendingImages, setPendingImages] = useState<ImageType[]>([]);

  // Auth context for token and userId
  const { token, getToken, user: authUser, refreshUser } = useAuth();
  const userId = authUser?.id;

  const [hasSubmittedProfile, setHasSubmittedProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback(
    (field: keyof ProfileCreationData, value: string | number | string[]) => {
      // Update the context so data is shared with HeroOnboarding
      updateContextData({ [field]: value });
      
      // Debounced validation for better performance
      const timeoutId = setTimeout(() => {
        validateField(field, value);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    },
    [updateContextData]
  );

  const handleProfileImagesChange = useCallback(
    (imgs: (string | ImageType)[]) => {
      // Separate IDs and image objects
      const ids = imgs.map((img) => (typeof img === "string" ? img : img.id));
      if (
        JSON.stringify(ids) !== JSON.stringify(formData.profileImageIds ?? [])
      ) {
        handleInputChange("profileImageIds", ids);
        try {
          localStorage.setItem("pendingProfileImages", JSON.stringify(ids));
        } catch (err) {
          console.warn("Unable to store images in localStorage", err);
        }
      }

      // Extract ImageType objects for later upload
      const imgObjects = imgs.filter(
        (img): img is ImageType => typeof img !== "string"
      );
      setPendingImages(imgObjects);
    },
    [handleInputChange, formData.profileImageIds]
  );

  const validateStep = () => {
    const schemaIndex = displayStep - 1;
    if (schemaIndex >= 0 && schemaIndex < stepSchemas.length) {
      const schema = stepSchemas[schemaIndex];
      const result = schema.safeParse(formData);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[String(e.path[0])] = e.message;
        });

        // Build more descriptive error message with field name
        const firstIssue = result.error.errors[0];
        const fieldLabel = firstIssue?.path?.[0]
          ? String(firstIssue.path[0])
              .replace(/([A-Z])/g, " $1") // split camelCase
              .replace(/^\w/, (c) => c.toUpperCase())
          : "Field";
        const firstError = firstIssue
          ? `${fieldLabel}: ${firstIssue.message}`
          : "Please fill required fields";
        showErrorToast(null, firstError);

        // Only update state if error set actually changed
        if (JSON.stringify(errors) !== JSON.stringify(fieldErrors)) {
          setErrors(fieldErrors);
        }
        return false;
      }
    }

    // Clear errors only if previously non-empty
    if (Object.keys(errors).length) {
      setErrors({});
    }
    return true;
  };

  // Validate individual field
  const validateField = (field: keyof ProfileCreationData, value: unknown) => {
    // Find which step this field belongs to
    let fieldSchema: z.ZodSchema | null = null;

    for (const schema of stepSchemas) {
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        if (field in shape) {
          fieldSchema = shape[field as keyof typeof shape];
          break;
        }
      }
    }

    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        const error = result.error.errors[0]?.message || "Invalid value";
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      } else {
        // Clear error for this field
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        return true;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    // Additional validation before moving to sign-up step
    if (displayStep === 6) {
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
        showErrorToast(
          null,
          `Please complete all required fields before creating account. Missing: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}`
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
    if (isAuthenticated && displayStep === 7) {
      // User is signed in, profile submission will happen automatically
      console.log("User signed in at step 7, profile will be submitted");
    }
  }, [isAuthenticated, displayStep]);

  // -------- Auto submit profile & images when user is signed in --------
  useEffect(() => {
    const submitProfileAndImages = async () => {
      if (!isAuthenticated) return;
      if (hasSubmittedProfile) return; // guard
      if (isSubmitting) return; // prevent double submission

      // Only submit if we're on the final step
      if (displayStep !== 7) {
        console.log(
          "Not on final step, skipping submission. Current step:",
          displayStep
        );
        return;
      }

      setIsSubmitting(true);

      // Ensure we have a token
      const authToken = token ?? (await getToken());
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
          onClose();
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
          showErrorToast(profileRes.error, "Failed to create profile");
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
        await refreshUser();
        // Clean up all onboarding data
        clearAllOnboardingData();
        showSuccessToast("Profile created successfully!");
        onClose();
        // Redirect to success page
        router.push("/success");
      } catch (err) {
        console.error("Profile submission error", err);
        
        // Provide specific error messages based on error type
        let errorMessage = "Profile submission failed";
        if (err instanceof Error) {
          if (err.message.includes("network") || err.message.includes("fetch")) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Request timed out. Please try again.";
          } else if (err.message.includes("401") || err.message.includes("unauthorized")) {
            errorMessage = "Authentication expired. Please sign in again.";
          } else if (err.message.includes("409") || err.message.includes("duplicate")) {
            errorMessage = "Profile already exists. Please use the profile edit feature.";
          } else if (err.message.includes("400") || err.message.includes("validation")) {
            errorMessage = "Invalid profile data. Please check your information and try again.";
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
    displayStep,
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose(); // only close when intended, ignore internal true events
      }}
    >
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden bg-white sm:max-h-[90vh] max-h-screen sm:rounded-lg rounded-none"
        onInteractOutside={(e) => {
          e.preventDefault(); // keep modal open even when Clerk portals register outside clicks
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="relative">
          {/* Progress indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-pink-600 transition-all duration-300"
              style={{ width: `${(displayStep / totalSteps) * 100}%` }}
            />
          </div>

          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Find Your Perfect Match
            </DialogTitle>
            {step < 4 && (
              <p className="text-gray-600 mt-2">
                Join thousands of Afghan singles finding love
              </p>
            )}
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
                {displayStep === 1 && !hasBasicData && (
                  <div className="space-y-6">
                    <div>
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

                    <div>
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

                {/* Step 2: Location \Step 2: Location, Contact & Physical Physical */}
                {
                  displayStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <Label
                          htmlFor="country"
                          className="text-gray-700 mb-2 block"
                        >
                          Country
                        </Label>
                        <SearchableSelect
                          options={countries.map((c) => ({
                            value: c,
                            label: c,
                          }))}
                          value={formData.country}
                          onValueChange={(v) => handleInputChange("country", v)}
                          placeholder="Select country"
                        />
                      </div>
                      <div>
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
                          placeholder="City"
                        />
                      </div>
                      <div>
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
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="maritalStatus"
                          className="text-gray-700 mb-2 block"
                        >
                          {required("Marital Status")}
                        </Label>
                        <Select
                          value={formData.maritalStatus}
                          onValueChange={(v) =>
                            handleInputChange("maritalStatus", v)
                          }
                        >
                          <SelectTrigger
                            id="maritalStatus"
                            className="w-full bg-white"
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200">
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="annulled">Annulled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="physicalStatus"
                          className="text-gray-700 mb-2 block"
                        >
                          Physical Status
                        </Label>
                        <Select
                          value={formData.physicalStatus}
                          onValueChange={(v) =>
                            handleInputChange("physicalStatus", v)
                          }
                        >
                          <SelectTrigger
                            id="physicalStatus"
                            className="w-full bg-white"
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="differently-abled">
                              Differently-abled
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                }

                {
                  /* Step 3: Cultural & Lifestyle */
                }
                {
                  displayStep === 3 && (
                    <div className="space-y-6">
                      <div>
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
                      <div>
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
                          onValueChange={(v) =>
                            handleInputChange("religion", v)
                          }
                          placeholder="Select religion"
                        />
                      </div>
                      <div>
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
                          onValueChange={(v) =>
                            handleInputChange("ethnicity", v)
                          }
                          placeholder="Select ethnicity"
                        />
                      </div>
                      <div>
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
                            <SelectItem value="vegetarian">
                              Vegetarian
                            </SelectItem>
                            <SelectItem value="non-vegetarian">
                              Non-Vegetarian
                            </SelectItem>
                            <SelectItem value="halal">Halal Only</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
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
                          <SelectTrigger
                            id="smoking"
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
                      <div>
                        <Label
                          htmlFor="drinking"
                          className="text-gray-700 mb-2 block"
                        >
                          Drinking
                        </Label>
                        <Select
                          value={formData.drinking}
                          onValueChange={(v) =>
                            handleInputChange("drinking", v)
                          }
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
                  );
                }

                {
                  /* Step 4: Education & Career */
                }
                {
                  displayStep === 4 && (
                    <div className="space-y-6">
                      <div>
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
                      <div>
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
                      <div>
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
                      <div>
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
                  );
                }

                {
                  /* Step 5: Partner Preferences */
                }
                {
                  displayStep === 5 && (
                    <div className="space-y-6">
                      <div>
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
                      <div>
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
                      <div>
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
                  );
                }

                {
                  /* Step 6: Photos (Optional) */
                }
                {
                  displayStep === 6 && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-gray-700 mb-2 block">
                          Profile Photos
                        </Label>
                        <ProfileImageUpload
                          userId={"user-id-placeholder"}
                          mode="create"
                          onImagesChanged={handleProfileImagesChange}
                          className="w-full h-48"
                        />
                        {errors.profileImageIds && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors.profileImageIds}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                {
                  /* Step 7: Clerk SignUp */
                }
                {
                  displayStep === 7 && (
                    <div className="space-y-6">
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

                          const missingFields = requiredFields.filter(
                            (field) => {
                              const value =
                                formData[field as keyof ProfileCreationData];
                              return (
                                !value ||
                                (typeof value === "string" &&
                                  value.trim() === "")
                              );
                            }
                          );

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
                                  Missing:{" "}
                                  {missingFields.slice(0, 5).join(", ")}
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
                  );
                }
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between">
              {step > 1 && step <= 7 && (
                <Button variant="outline" onClick={handleBack} disabled={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {step < 7 && (
                <Button
                  onClick={handleNext}
                  // Allow click; handleNext will perform validation and show errors
                  // This prevents users from being blocked when UI appears complete
                  disabled={false}
                  className={`${step === 1 ? "w-full" : "ml-auto"} bg-pink-600 hover:bg-pink-700 text-white`}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
