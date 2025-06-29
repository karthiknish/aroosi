"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import { SignUp } from "@clerk/nextjs";
import * as z from "zod";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useAuthContext } from "@/components/AuthProvider";
import {
  submitProfile,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";
import { useRouter } from "next/navigation";
import { getImageUploadUrl, saveImageMeta } from "@/lib/utils/imageUtil";
import type { ImageType } from "@/types/image";

interface ProfileData {
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
}

interface ProfileCreationData extends ProfileData {
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
  partnerPreferenceAgeMax: number;
  partnerPreferenceCity: string[];
  profileImageIds?: string[];
}

interface ProfileCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ProfileData & Partial<ProfileCreationData>>;
}

// Zod schema for all fields (simplified for modal, can be extended)
const profileSchema = z.object({
  profileFor: z.string().min(1, "Profile for is required"),
  gender: z.string().min(1, "Gender is required"),
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(7, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  height: z.string().min(1, "Height is required"),
  maritalStatus: z.string().min(1, "Marital status is required"),
  physicalStatus: z.string().min(1, "Physical status is required"),
  motherTongue: z.string().min(1, "Mother tongue is required"),
  religion: z.string().min(1, "Religion is required"),
  ethnicity: z.string().min(1, "Ethnicity is required"),
  diet: z.string().min(1, "Diet is required"),
  smoking: z.string().min(1, "Smoking is required"),
  drinking: z.string().min(1, "Drinking is required"),
  education: z.string().min(1, "Education is required"),
  occupation: z.string().min(1, "Occupation is required"),
  annualIncome: z.string().min(1, "Annual income is required"),
  aboutMe: z.string().min(10, "About Me is required"),
  preferredGender: z.string().min(1, "Preferred gender is required"),
  partnerPreferenceAgeMin: z.number().min(18, "Min age 18"),
  partnerPreferenceAgeMax: z.number().max(99, "Max age 99"),
  partnerPreferenceCity: z.array(z.string()),
  profileImageIds: z.array(z.string()).optional(),
});

// Validation schemas aligned with visible steps
const stepSchemas = [
  // Step 1 – Basic (shown only when not supplied from onboarding)
  profileSchema.pick({
    profileFor: true,
    gender: true,
  }),
  // Step 2 – Location & Physical
  profileSchema.pick({
    country: true,
    city: true,
    height: true,
    maritalStatus: true,
    physicalStatus: true,
  }),
  // Step 3 – Cultural & Lifestyle
  profileSchema.pick({
    motherTongue: true,
    religion: true,
    ethnicity: true,
    diet: true,
    smoking: true,
    drinking: true,
  }),
  // Step 4 – Education & Career
  profileSchema.pick({
    education: true,
    occupation: true,
    annualIncome: true,
    aboutMe: true,
  }),
  // Step 5 – Partner Preferences
  profileSchema
    .pick({
      preferredGender: true,
      partnerPreferenceAgeMin: true,
      partnerPreferenceAgeMax: true,
      partnerPreferenceCity: true,
    })
    .extend({
      partnerPreferenceCity: z.array(z.string()).optional(),
    }),
  // Step 6 – Photos (optional but still validate array type)
  profileSchema.pick({ profileImageIds: true }),
];

// Static list of countries for selector
const countries: string[] = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Afghanistan",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Germany",
  "France",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Italy",
  "Spain",
  "Portugal",
  "Ireland",
  "Other",
];

const clerkAppearance = {
  layout: {
    logoImageUrl: "", // Remove logo image altogether
    logoPlacement: "outside" as const, // Ensure logo is not rendered inside the card
  },
  elements: {
    logoImage: "hidden", // legacy selector
    headerLogo: "hidden", // new selector for the logo
    logoBox: "hidden", // container around the logo
    headerTitle: "hidden", // hide title inside card
    headerSubtitle: "hidden", // hide subtitle
    socialButtons: "hidden", // hide social buttons section
    footer: "hidden", // hide footer links
    card: "shadow-none bg-transparent p-0", // remove default card shadow/padding
  },
};

export function ProfileCreationModal({
  isOpen,
  onClose,
  initialData,
}: ProfileCreationModalProps) {
  // Determine if we already have the basic fields (collected in HeroOnboarding)
  const hasBasicData =
    Boolean(initialData?.profileFor) && Boolean(initialData?.gender);

  // Total number of steps adjusts when we skip the duplicate first step
  const totalSteps = hasBasicData ? 6 : 7;

  // React state for the current UI step (1-based within the displayed steps)
  const [step, setStep] = useState<number>(1);

  // Display step that aligns with visible UI, accounting for skipped basic step
  const displayStep = hasBasicData ? step + 1 : step;

  const [formData, setFormData] = useState<ProfileCreationData>({
    profileFor: initialData?.profileFor || "",
    gender: initialData?.gender || "",
    fullName: initialData?.fullName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    country: initialData?.country || "",
    city: initialData?.city || "",
    height: initialData?.height || "",
    maritalStatus: initialData?.maritalStatus || "",
    physicalStatus: initialData?.physicalStatus || "",
    motherTongue: initialData?.motherTongue || "",
    religion: initialData?.religion || "",
    ethnicity: initialData?.ethnicity || "",
    diet: initialData?.diet || "",
    smoking: initialData?.smoking || "",
    drinking: initialData?.drinking || "",
    education: initialData?.education || "",
    occupation: initialData?.occupation || "",
    annualIncome: initialData?.annualIncome || "",
    aboutMe: initialData?.aboutMe || "",
    preferredGender: initialData?.preferredGender || "",
    partnerPreferenceAgeMin: initialData?.partnerPreferenceAgeMin || 18,
    partnerPreferenceAgeMax: initialData?.partnerPreferenceAgeMax || 35,
    partnerPreferenceCity: initialData?.partnerPreferenceCity || [],
    profileImageIds: initialData?.profileImageIds || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const {
    token: contextToken,
    isSignedIn,
    getToken: authCtxGetToken,
  } = useAuthContext();
  const { user } = useUser();
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageType[]>([]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("pendingProfileData", JSON.stringify(formData));
    }
  }, [formData, isOpen]);

  useEffect(() => {
    const saveProfileIfNeeded = async () => {
      if (isSignedIn && displayStep === 7 && !profileSubmitted) {
        try {
          const token = contextToken ?? (await authCtxGetToken());
          if (!token) return;

          // 1) Upload any locally stored images (ids starting with "local-")
          const uploadedImageIds: string[] = [];

          try {
            for (const img of pendingImages) {
              if (!img.id.startsWith("local-")) {
                uploadedImageIds.push(img.id);
                continue;
              }

              // Reconstruct File from blob URL
              const blobResp = await fetch(img.url);
              const blob = await blobResp.blob();
              const fileName = img.fileName || `photo_${Date.now()}.jpg`;
              const fileType = blob.type || "image/jpeg";

              // a) get upload URL
              const uploadUrl = await getImageUploadUrl(token);

              // b) upload file to storage
              const storageResp = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": fileType },
                body: blob,
              });

              if (!storageResp.ok) {
                console.error("Failed uploading image blob");
                continue;
              }

              const storageJson = await storageResp.json().catch(() => null);
              const storageId =
                storageJson?.storageId ||
                (typeof storageJson === "string" ? storageJson : null);
              if (!storageId) {
                console.error("Invalid storage response", storageJson);
                continue;
              }

              // c) save metadata
              try {
                await saveImageMeta({
                  token,
                  userId: user?.id || "",
                  storageId,
                  fileName,
                  contentType: fileType,
                  fileSize: blob.size,
                });
              } catch (err) {
                console.error("Failed to save image meta", err);
              }

              uploadedImageIds.push(storageId);
            }
          } catch (imgErr) {
            console.error("Image upload error", imgErr);
          }

          // Merge uploaded image IDs into profile values
          const { profileFor, ...rest } = formData;
          void profileFor;
          const profileValues = {
            ...rest,
            profileImageIds: uploadedImageIds.length
              ? uploadedImageIds
              : rest.profileImageIds,
          } as typeof rest;

          const result = await submitProfile(token, profileValues, "create");
          if (result.success) {
            try {
              await getCurrentUserWithProfile(token);
            } catch {}

            localStorage.removeItem("pendingProfileData");
            setProfileSubmitted(true);

            // redirect to search after full profile creation
            router.push("/search");
          } else {
            console.error("Failed to submit profile:", result.error);
          }
        } catch (err) {
          console.error("Error submitting profile:", err);
        }
      }
    };
    void saveProfileIfNeeded();
  }, [
    isSignedIn,
    displayStep,
    profileSubmitted,
    formData,
    contextToken,
    authCtxGetToken,
    router,
    pendingImages,
    user,
  ]);

  const handleInputChange = (
    field: keyof ProfileCreationData,
    value: string | number | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    [formData.profileImageIds]
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
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Pure validator that does *not* update React state — safe to use inside render
  const isStepValid = useCallback((): boolean => {
    const schemaIndex = displayStep - 1;
    if (schemaIndex < 0 || schemaIndex >= stepSchemas.length) return true;
    return stepSchemas[schemaIndex].safeParse(formData).success;
  }, [displayStep, formData]);

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
                {/* Step 1: Profile For & Gender (only shown when data not yet provided) */}
                {displayStep === 1 && !hasBasicData && (
                  <div className="space-y-6">
                    <div>
                      <Label
                        htmlFor="profileFor"
                        className="text-gray-700 mb-2 block"
                      >
                        This profile is for
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
                      <Label className="text-gray-700 mb-2 block">Gender</Label>
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
                        City
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
                        Height
                      </Label>
                      <Select
                        value={formData.height}
                        onValueChange={(v) => handleInputChange("height", v)}
                      >
                        <SelectTrigger id="height" className="w-full bg-white">
                          <SelectValue placeholder="Select height..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          {[...Array(37)].map((_, i) => {
                            const feet = 4 + Math.floor(i / 12);
                            const inches = i % 12;
                            return (
                              <SelectItem
                                key={i}
                                value={`${feet}&apos;${inches}&quot;`}
                              >
                                {feet}&apos;{inches}&quot;
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="maritalStatus"
                        className="text-gray-700 mb-2 block"
                      >
                        Marital Status
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
                        Education
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
                        Occupation
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
                        About Me
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
                        Preferred Gender
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
                              Number(e.target.value)
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
                        value={
                          Array.isArray(formData.partnerPreferenceCity)
                            ? formData.partnerPreferenceCity.join(", ")
                            : ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "partnerPreferenceCity",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
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
                    <div>
                      <SignUp routing="virtual" appearance={clerkAppearance} />
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
                  disabled={!isStepValid()}
                  className={`${step === 1 ? "w-full" : "ml-auto"} bg-pink-600 hover:bg-pink-700 text-white`}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {/* The modal is for users creating a profile after onboarding; hide sign-in prompt */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
