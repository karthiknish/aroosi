"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CITIES } from "@/lib/constants/cities";
import CustomSignupForm from "@/components/auth/CustomSignupForm";
import { useAuthContext } from "@/components/AuthProvider";
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
  // Step 2 – Location & Physical (only city, height, maritalStatus are required)
  profileSchema.pick({
    country: true,
    city: true,
    height: true,
    maritalStatus: true,
    physicalStatus: true,
  }),
  // Step 3 – Cultural & Lifestyle (all optional)
  z.object({
    motherTongue: z.string().optional(),
    religion: z.string().optional(),
    ethnicity: z.string().optional(),
    diet: z.string().optional(),
    smoking: z.string().optional(),
    drinking: z.string().optional(),
  }),
  // Step 4 – Education & Career (education, occupation, aboutMe are required)
  profileSchema.pick({
    education: true,
    occupation: true,
    annualIncome: true,
    aboutMe: true,
  }),
  // Step 5 – Partner Preferences (only preferredGender is required)
  z.object({
    preferredGender: z.string().min(1, "Preferred gender is required"),
    partnerPreferenceAgeMin: z.number().min(18).optional(),
    partnerPreferenceAgeMax: z.number().max(99).optional(),
    partnerPreferenceCity: z.array(z.string()).optional(),
  }),
  // Step 6 – Photos (optional but still validate array type)
  profileSchema.pick({ profileImageIds: true }),
];

// Build comprehensive country list from countryCodes constant
const countries: string[] = Array.from(
  new Set(countryCodes.map((c: { country: string }) => c.country)),
).sort();

export function ProfileCreationModal({
  isOpen,
  onClose,
  initialData,
}: ProfileCreationModalProps) {
  const router = useRouter();

  // Get data from the shared ProfileWizard context
  const { formData: contextData, updateFormData: updateContextData } =
    useProfileWizard();

  // Debug: comment out verbose logging in production
  console.log(
    "ProfileCreationModal contextData from ProfileWizard:",
    contextData,
  );
  console.log("ProfileCreationModal initialData prop:", initialData);

  // Also log what's in localStorage to verify
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE_CREATION);
      console.log(
        "ProfileCreationModal localStorage data:",
        stored ? JSON.parse(stored) : null,
      );
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
  }

  // Determine if we already have the basic fields (collected in HeroOnboarding)
  const hasBasicData = Boolean(
    contextData?.profileFor &&
      contextData?.gender &&
      contextData?.fullName &&
      contextData?.dateOfBirth &&
      contextData?.phoneNumber,
  );

  // Total number of steps adjusts when we skip the duplicate first step
  const totalSteps = hasBasicData ? 6 : 7;

  // React state for the current UI step (1-based within the displayed steps)
  const [step, setStep] = useState<number>(1);
  // ---------- State persistence & redirect helpers ----------

  // We'll initialise these after formData is declared below

  const [formData, setFormData] = useState<ProfileCreationData>(() => {
    // Use context data as the base, then merge with any initialData prop
    const mergedData: ProfileCreationData = {
      profileFor:
        (contextData?.profileFor as string) || initialData?.profileFor || "",
      gender: (contextData?.gender as string) || initialData?.gender || "",
      fullName:
        (contextData?.fullName as string) || initialData?.fullName || "",
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
        (contextData?.motherTongue as string) ||
        initialData?.motherTongue ||
        "",
      religion:
        (contextData?.religion as string) || initialData?.religion || "",
      ethnicity:
        (contextData?.ethnicity as string) || initialData?.ethnicity || "",
      diet: (contextData?.diet as string) || initialData?.diet || "",
      smoking: (contextData?.smoking as string) || initialData?.smoking || "",
      drinking:
        (contextData?.drinking as string) || initialData?.drinking || "",
      education:
        (contextData?.education as string) || initialData?.education || "",
      occupation:
        (contextData?.occupation as string) || initialData?.occupation || "",
      annualIncome:
        (contextData?.annualIncome as string) ||
        initialData?.annualIncome ||
        "",
      aboutMe: (contextData?.aboutMe as string) || initialData?.aboutMe || "",
      preferredGender:
        (contextData?.preferredGender as string) ||
        initialData?.preferredGender ||
        "",
      partnerPreferenceAgeMin:
        (contextData?.partnerPreferenceAgeMin as number) ||
        initialData?.partnerPreferenceAgeMin ||
        18,
      partnerPreferenceAgeMax: contextData?.partnerPreferenceAgeMax as
        | number
        | undefined,
      partnerPreferenceCity:
        (contextData?.partnerPreferenceCity as string[]) ||
        initialData?.partnerPreferenceCity ||
        [],
      profileImageIds:
        (contextData?.profileImageIds as string[]) ||
        initialData?.profileImageIds ||
        [],
    };
    console.log("ProfileCreationModal merged formData:", mergedData);
    return mergedData;
  });

  // Sync context data changes to form data
  useEffect(() => {
    if (contextData && Object.keys(contextData).length > 0) {
      setFormData((prev) => ({
        ...prev,
        profileFor:
          (contextData?.profileFor as string) || prev.profileFor || "",
        gender: (contextData?.gender as string) || prev.gender || "",
        fullName: (contextData?.fullName as string) || prev.fullName || "",
        dateOfBirth:
          (contextData?.dateOfBirth as string) || prev.dateOfBirth || "",
        email: (contextData?.email as string) || prev.email || "",
        phoneNumber:
          (contextData?.phoneNumber as string) || prev.phoneNumber || "",
      }));
    }
  }, [contextData]);

  // Persist wizard state to localStorage to survive OAuth full-page redirects
  const restoreWizardState = () => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE_CREATION);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        step?: number;
        formData?: Partial<ProfileCreationData>;
      };

      if (parsed.formData && typeof parsed.formData === "object") {
        const cleaned: Partial<ProfileCreationData> = {};
        Object.entries(parsed.formData).forEach(([k, v]) => {
          const keep =
            v !== undefined &&
            v !== null &&
            !(typeof v === "string" && v.trim() === "") &&
            !(Array.isArray(v) && v.length === 0);
          if (keep) {
            (cleaned as Record<string, unknown>)[k] = v;
          }
        });

        if (Object.keys(cleaned).length) {
          setFormData((prev) => ({ ...prev, ...cleaned }));
        }
      }

      if (parsed.step && parsed.step >= 1 && parsed.step <= 7) {
        setStep(parsed.step);
      }
    } catch {
      console.warn("Failed to restore wizard state");
    }
  };
  useEffect(() => {
    // Since we're using the shared context, we don't need to migrate data
    // The context already has all the data from HeroOnboarding

    // Only restore wizard state if we don't have context data
    if (!hasBasicData) {
      restoreWizardState();
    }
  }, []);

  // Update formData when contextData changes (e.g., when loaded from localStorage)
  useEffect(() => {
    if (contextData && Object.keys(contextData).length > 0) {
      setFormData((prev) => {
        const updated: ProfileCreationData = { ...prev };

        // Update hero onboarding fields if they exist
        if (contextData.profileFor)
          updated.profileFor = contextData.profileFor as string;
        if (contextData.gender) updated.gender = contextData.gender as string;
        if (contextData.fullName)
          updated.fullName = contextData.fullName as string;
        if (contextData.dateOfBirth)
          updated.dateOfBirth = contextData.dateOfBirth as string;
        if (contextData.phoneNumber)
          updated.phoneNumber = contextData.phoneNumber as string;

        // Update other fields if they exist
        if (contextData.email) updated.email = contextData.email as string;
        if (contextData.country)
          updated.country = contextData.country as string;
        if (contextData.city) updated.city = contextData.city as string;
        if (contextData.height) updated.height = contextData.height as string;
        if (contextData.maritalStatus)
          updated.maritalStatus = contextData.maritalStatus as string;
        if (contextData.physicalStatus)
          updated.physicalStatus = contextData.physicalStatus as string;
        if (contextData.motherTongue)
          updated.motherTongue = contextData.motherTongue as string;
        if (contextData.religion)
          updated.religion = contextData.religion as string;
        if (contextData.ethnicity)
          updated.ethnicity = contextData.ethnicity as string;
        if (contextData.diet) updated.diet = contextData.diet as string;
        if (contextData.smoking)
          updated.smoking = contextData.smoking as string;
        if (contextData.drinking)
          updated.drinking = contextData.drinking as string;
        if (contextData.education)
          updated.education = contextData.education as string;
        if (contextData.occupation)
          updated.occupation = contextData.occupation as string;
        if (contextData.annualIncome)
          updated.annualIncome = contextData.annualIncome as string;
        if (contextData.aboutMe)
          updated.aboutMe = contextData.aboutMe as string;
        if (contextData.preferredGender)
          updated.preferredGender = contextData.preferredGender as string;
        if (contextData.partnerPreferenceAgeMin)
          updated.partnerPreferenceAgeMin =
            contextData.partnerPreferenceAgeMin as number;
        if (contextData.partnerPreferenceAgeMax !== undefined)
          updated.partnerPreferenceAgeMax =
            contextData.partnerPreferenceAgeMax as number;
        if (contextData.partnerPreferenceCity)
          updated.partnerPreferenceCity =
            contextData.partnerPreferenceCity as string[];
        if (contextData.profileImageIds)
          updated.profileImageIds = contextData.profileImageIds as string[];

        console.log(
          "ProfileCreationModal - Updated formData from context:",
          updated,
        );
        return updated;
      });
    }
  }, [contextData]); // Save whenever form data or step changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Save all form data to localStorage
      // The separation logic is only needed when reading/restoring data
      localStorage.setItem(
        STORAGE_KEYS.PROFILE_CREATION,
        JSON.stringify({
          step,
          formData,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [formData, step]);

  // Clean up HeroOnboarding localStorage when modal unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Display step that aligns with visible UI, accounting for skipped basic step
  const displayStep = hasBasicData ? step + 1 : step;

  // Local controlled input for preferred cities to allow commas while typing
  const [preferredCitiesInput, setPreferredCitiesInput] = useState<string>(
    Array.isArray(formData.partnerPreferenceCity)
      ? formData.partnerPreferenceCity.join(", ")
      : "",
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
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Also update the context so data is shared with HeroOnboarding
      updateContextData({ [field]: value });
    },
    [updateContextData],
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
        (img): img is ImageType => typeof img !== "string",
      );
      setPendingImages(imgObjects);
    },
    [handleInputChange, formData.profileImageIds],
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

        // Show toast with first error message
        const firstError =
          result.error.errors[0]?.message ?? "Please fill required fields";
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
          `Please complete all required fields before creating account. Missing: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}`,
        );
        console.error(
          "Cannot proceed to sign-up - missing fields:",
          missingFields,
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
  const { isAuthenticated, user, signOut } = useAuth();

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
          displayStep,
        );
        return;
      }

      setIsSubmitting(true);

      // Ensure we have a token
      const authToken = token ?? (await getToken());
      if (!authToken) return;

      try {
        // Check for existing profile – do NOT allow update via modal
        const existing = await getCurrentUserWithProfile(authToken);
        if (existing.success && existing.data) {
          console.log("Profile already exists");
          showErrorToast(
            null,
            "A profile already exists for this account. Please use the profile edit feature instead.",
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

        const missingFields = requiredFields.filter(
          (field) => !cleanedData[field],
        );
        if (missingFields.length > 0) {
          console.error(
            "CRITICAL: Blocking profile submission - missing required fields:",
            missingFields,
          );
          console.error("Current cleanedData:", cleanedData);
          console.error("Current formData:", formData);
          showErrorToast(
            null,
            `Cannot create profile. Missing required fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? " and more" : ""}. Please go back and complete all sections.`,
          );
          setHasSubmittedProfile(false);

          // Sign out the user to prevent incomplete profile
          await signOut();

          // Close the modal and reset
          onClose();
          // Clear any stale data
          clearAllOnboardingData();
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
            cleanedData.partnerPreferenceCity,
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
          for (const img of pendingImages) {
            try {
              // Fetch the blob from the object URL
              const blob = await fetch(img.url).then((r) => r.blob());
              const file = new File([blob], img.fileName || "photo.jpg", {
                type: blob.type || "image/jpeg",
              });

              const uploadUrl = await getImageUploadUrl(authToken);

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
              if (!storageId) continue;

              await saveImageMeta({
                token: authToken,
                userId,
                storageId,
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
              });
            } catch (err) {
              console.error("Image upload error", err);
            }
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
        showErrorToast(err, "Profile submission failed");
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
        className="max-w-md w-full p-0 overflow-hidden bg-white"
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
              style={{ width: `${(step / totalSteps) * 100}%` }}
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
                {displayStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <Label
                        htmlFor="country"
                        className="text-gray-700 mb-2 block"
                      >
                        Country
                      </Label>
                      <SearchableSelect
                        options={countries.map((c) => ({ value: c, label: c }))}
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
                          },
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
                )}

                {/* Step 3: Cultural & Lifestyle */}
                {displayStep === 3 && (
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
                        onValueChange={(v) => handleInputChange("religion", v)}
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
                        onValueChange={(v) => handleInputChange("ethnicity", v)}
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
                          <SelectItem value="vegetarian">Vegetarian</SelectItem>
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

                {/* Step 4: Education & Career */}
                {displayStep === 4 && (
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
                )}

                {/* Step 5: Partner Preferences */}
                {displayStep === 5 && (
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
                              Number(e.target.value),
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
                                : Number(e.target.value),
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
                )}

                {/* Step 6: Photos (Optional) */}
                {displayStep === 6 && (
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
                )}

                {/* Step 7: Clerk SignUp */}
                {displayStep === 7 && (
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
                                "Signup completed; profile submission will auto-run",
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
