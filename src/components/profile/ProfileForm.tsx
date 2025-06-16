"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { defaultRHFConfig } from "@/lib/forms/useRHFConfig";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showErrorToast } from "@/lib/ui/toast";

// Import custom hooks for image handling
import { useImageReorder, useDeleteImage } from "@/lib/utils/profileImageUtils";

// Import UI components
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Import step components
import ProfileFormStepBasicInfo from "./ProfileFormStepBasicInfo";
import ProfileFormStepLocation from "./ProfileFormStepLocation";
import ProfileFormStepCultural from "./ProfileFormStepCultural";
import ProfileFormStepEducation from "./ProfileFormStepEducation";
import ProfileFormStepAbout from "./ProfileFormStepAbout";
import ProfileFormStepImages from "./ProfileFormStepImages";

// Import auth context
import { useAuthContext } from "@/components/AuthProvider";

// Add Next.js router
import { useRouter, usePathname } from "next/navigation";

// Import user profile API
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";

// Import profile type
import type { Profile } from "@/types/profile";

// Import ApiImage type
import type { MappedImage } from "@/lib/utils/profileImageUtils";

// Import ImageType from '@/types/image'
import type { ImageType } from "@/types/image";

// Import ProfileFormValues from types folder
import type { ProfileFormValues as ProfileFormValuesFromTypes } from "@/types/profile";

// Types
type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say" | "other";

// Re-export the shared type for downstream imports so existing import paths continue to work.
export type ProfileFormValues = ProfileFormValuesFromTypes;

interface ProfileFormProps {
  mode?: "create" | "edit";
  initialValues?: Partial<ProfileFormValues>;
  onSubmit?: (
    values: ProfileFormValues & { profileImageIds: string[] }
  ) => void | Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  submitButtonText?: string;
  userId?: string;
  onEditDone?: () => void;
  profileId?: string;
  userImages?: MappedImage[];
}

const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}> = ({ title, children, gridClassName }) => (
  <section className="mb-10 pt-6 first:pt-0 first:border-t-0 border-t">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
    <div
      className={
        gridClassName || "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
      }
    >
      {children}
    </div>
  </section>
);

const essentialProfileSchema = z.object({
  profileFor: z.enum(["self", "friend", "family"], {
    required_error: "Please select who you are creating this profile for.",
  }),
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  height: z.string().min(1, "Height is required"),
  ukCity: z.string().min(1, "City is required"),
  ukPostcode: z.string().min(1, "Postcode is required"),
  aboutMe: z.string().min(1, "About Me is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  preferredGender: z.string().min(1, "Preferred gender is required"),
  partnerPreferenceAgeMin: z.union([z.string(), z.number()]),
  partnerPreferenceAgeMax: z.union([z.string(), z.number()]),
  partnerPreferenceUkCity: z.union([z.string(), z.array(z.string())]),
  maritalStatus: z.string(),
  education: z.string(),
  occupation: z.string(),
  annualIncome: z.union([z.string(), z.number()]),
  diet: z.string(),
  smoking: z.string(),
  drinking: z.string(),
  physicalStatus: z.string(),
});

// Height conversion utility function
export const cmToFeetInches = (cm: number): string => {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};

const stepTips = [
  "Tip: Use your real name and accurate details for better matches.",
  "Tip: Sharing your city helps us find matches near you.",
  "Tip: Sharing your background helps us personalize your experience.",
  "Tip: Education and career info helps you stand out.",
  "Tip: Write a friendly, honest 'About Me' to attract the right matches.",
  "Tip: A clear profile photo increases your chances by 3x!",
];

const totalSteps = 6;

// Helper to map Profile to ProfileFormValues
export function mapProfileToFormValues(
  profile: Profile
): Partial<ProfileFormValues> {
  if (!profile || typeof profile !== "object") return {};

  // Strip profileImageUrls which is not part of the form schema
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { profileImageUrls, ...p } = profile;

  return {
    ...p,
    gender: (() => {
      const g = typeof p.gender === "string" ? p.gender.toLowerCase() : "";
      return [
        "male",
        "female",
        "non-binary",
        "prefer-not-to-say",
        "other",
      ].includes(g)
        ? (g as Gender)
        : "other";
    })(),
    ukCity: p.ukCity ? p.ukCity.toLowerCase() : "",
    partnerPreferenceAgeMin:
      p.partnerPreferenceAgeMin !== undefined &&
      p.partnerPreferenceAgeMin !== null
        ? String(p.partnerPreferenceAgeMin)
        : "",
    partnerPreferenceAgeMax:
      p.partnerPreferenceAgeMax !== undefined &&
      p.partnerPreferenceAgeMax !== null
        ? String(p.partnerPreferenceAgeMax)
        : "",
    partnerPreferenceUkCity: Array.isArray(p.partnerPreferenceUkCity)
      ? p.partnerPreferenceUkCity.join(", ")
      : typeof p.partnerPreferenceUkCity === "string"
        ? p.partnerPreferenceUkCity
        : "",
    annualIncome:
      typeof p.annualIncome === "number"
        ? String(p.annualIncome)
        : p.annualIncome || "",
    height:
      typeof p.height === "number"
        ? String(p.height)
        : (p.height as string) || "",
  };
}

const LOCAL_STORAGE_KEY = "profileFormDraft";

const ProfileForm: React.FC<ProfileFormProps> = ({
  mode: _mode = "create",
  initialValues = {},
  onSubmit,
  loading = false,
  serverError = null,
  submitButtonText,
  userId: userIdProp,
  profileId,
  userImages,
}) => {
  const { token } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  // Determine mode based on pathname if not provided explicitly
  const mode = React.useMemo<"create" | "edit">(() => {
    if (pathname?.includes("create-profile")) return "create";
    if (pathname?.includes("profile/edit")) return "edit";
    return _mode;
  }, [pathname, _mode]);

  // Form state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting] = useState<boolean>(false);

  // New: Profile loading state and fetched profile
  const [profileLoading, setProfileLoading] = useState<boolean>(
    _mode === "edit"
  );
  const [fetchedProfile, setFetchedProfile] = useState<
    Partial<ProfileFormValues>
  >({});

  // Only fetch user profile if initialValues is empty (for create mode)
  React.useEffect(() => {
    if (_mode !== "edit") {
      // No need to fetch profile when creating.
      return;
    }

    if (initialValues && Object.keys(initialValues).length > 0) {
      setFetchedProfile({});
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchProfile() {
      if (!token) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const res = await getCurrentUserWithProfile(token);
        if (isMounted && res.success && res.data) {
          setFetchedProfile(mapProfileToFormValues(res.data));
        }
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    }
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [token, initialValues, _mode]);

  // Form
  const emptyDefaults = React.useMemo<ProfileFormValues>(
    () => ({
      profileFor: "self",
      fullName: "",
      dateOfBirth: "",
      gender: "prefer-not-to-say",
      height: "",
      ukCity: "",
      ukPostcode: "",
      aboutMe: "",
      phoneNumber: "",
      preferredGender: "any",
      partnerPreferenceAgeMin: "",
      partnerPreferenceAgeMax: "",
      partnerPreferenceUkCity: "",
      maritalStatus: "single",
      education: "",
      occupation: "",
      annualIncome: "",
      diet: "",
      smoking: "no",
      drinking: "no",
      physicalStatus: "",
      subscriptionPlan: "free",
    }),
    []
  );

  // Use a ref to track if we've initialized the form to prevent unnecessary resets
  const hasInitialized = React.useRef(false);

  // Compute merged initial values
  const mergedInitialValues = React.useMemo(() => {
    // Priority: fetchedProfile > initialValues > emptyDefaults
    return {
      ...emptyDefaults,
      ...initialValues,
      ...fetchedProfile,
    };
  }, [emptyDefaults, initialValues, fetchedProfile]);

  // Initialise the React Hook Form instance so we can pass it down to steps
  const form = useForm<ProfileFormValues, unknown, ProfileFormValues>({
    ...defaultRHFConfig<ProfileFormValues>(
      zodResolver(essentialProfileSchema) as unknown as Resolver<
        ProfileFormValues,
        unknown
      >
    ),
    defaultValues: mergedInitialValues as unknown as ProfileFormValues,
  });

  const { register, handleSubmit, formState, watch, reset } = form;

  // Reset form when mergedInitialValues change (after profile fetch)
  React.useEffect(() => {
    if (
      !hasInitialized.current &&
      Object.keys(mergedInitialValues).length > 0
    ) {
      reset(mergedInitialValues as unknown as ProfileFormValues);
      hasInitialized.current = true;
    }
  }, [mergedInitialValues, reset]);

  // Restore form state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        reset(parsedDraft as unknown as ProfileFormValues);
      } catch {
        // Ignore parse errors
      }
    }
  }, [reset]);

  // Save form state to localStorage on every change
  useEffect(() => {
    const subscription = watch((values) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // UK cities for location step
  const [ukCityOptions] = useState([
    { value: "london", label: "London" },
    { value: "birmingham", label: "Birmingham" },
    { value: "manchester", label: "Manchester" },
    { value: "leeds", label: "Leeds" },
    { value: "liverpool", label: "Liverpool" },
    { value: "newcastle", label: "Newcastle" },
    { value: "bradford", label: "Bradford" },
    { value: "sheffield", label: "Sheffield" },
    { value: "bristol", label: "Bristol" },
    { value: "cardiff", label: "Cardiff" },
    { value: "edinburgh", label: "Edinburgh" },
    { value: "glasgow", label: "Glasgow" },
    { value: "belfast", label: "Belfast" },
  ]);

  const { isValid } = formState;

  // Form submission: just call onSubmit with form data and imageOrder
  const handleFormSubmit = handleSubmit((data: ProfileFormValues) => {
    if (currentStep !== totalSteps - 1) {
      // Prevent submit if not on the last step
      return;
    }
    // Require at least one profile image for both create and edit
    const imageIds: string[] = (userImages ?? []).flatMap((img) => {
      if ("storageId" in img && typeof img.storageId === "string") {
        return [img.storageId];
      }
      if ("id" in img && typeof img.id === "string") {
        return [img.id];
      }
      if ("_id" in img && typeof (img as MappedImage)._id === "string") {
        return [(img as MappedImage)._id];
      }
      return [];
    });

    if (imageIds.length === 0) {
      showErrorToast(
        null,
        "Please upload at least one profile photo to continue."
      );
      return;
    }
    // Clear draft from localStorage on successful submit
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    onSubmit?.({
      ...data,
      profileImageIds: imageIds,
      annualIncome:
        typeof data.annualIncome === "string"
          ? parseFloat(data.annualIncome)
          : data.annualIncome,
    });
  });

  // Step navigation
  const handleNextStep = async () => {
    // Validate current step before moving forward
    if (currentStep === totalSteps - 1) {
      // last step will submit via parent
      return;
    }
    setCurrentStep(currentStep + 1);
  };
  const handlePrevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Button text
  const buttonText =
    submitButtonText || (mode === "create" ? "Create Profile" : "Save Changes");

  // Wrapper for the image step to only fetch images when on the image step
  const ProfileFormImageStepWrapper: React.FC<{
    images: (ImageType | MappedImage)[];
    profileId: string;
  }> = ({ images: initialImages, profileId }) => {
    // Normalize incoming images to ImageType shape
    const normalize = (arr: (ImageType | MappedImage)[]): ImageType[] =>
      arr.map((img) => {
        const id = "id" in img ? img.id : (img._id ?? img.storageId ?? "");
        const storageId =
          "storageId" in img ? img.storageId : (img._id ?? undefined);
        const name =
          "name" in img
            ? img.name
            : "fileName" in img
              ? img.fileName
              : undefined;
        const size = "size" in img ? img.size : undefined;
        const uploadedAt =
          "uploadedAt" in img
            ? (img as { uploadedAt?: number }).uploadedAt
            : undefined;

        return { id, url: img.url, name, size, storageId, uploadedAt };
      });

    const [images, setImages] = React.useState<ImageType[]>(
      normalize(initialImages)
    );

    React.useEffect(() => {
      setImages(normalize(initialImages));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialImages)]);

    const isLoading = false;
    const reorderImages = useImageReorder(profileId);
    const deleteImage = useDeleteImage(profileId);

    const handleReorder = async (newOrder: ImageType[]) => {
      const storageIds = newOrder.map((img) => img.storageId || img.id);
      await reorderImages(storageIds);
    };

    const handleDelete = async (imageId: string) => {
      await deleteImage(imageId, true);
      setImages((prev) => prev.filter((img) => img.storageId !== imageId));
      return;
    };

    return (
      <ProfileFormStepImages
        images={images}
        isLoading={isLoading}
        profileId={profileId}
        onImageReorder={handleReorder}
        onImageDelete={handleDelete}
        onImagesChanged={setImages}
      />
    );
  };

  // Show loading spinner while fetching profile
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="shadow-xl bg-white rounded-lg">
          {mode === "create" && (
            <div className="px-6 pt-6 mb-2">
              <label
                htmlFor="profileFor"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Who are you creating this profile for?
              </label>
              <select
                id="profileFor"
                {...register("profileFor", { required: true })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              >
                <option value="self">Myself</option>
                <option value="friend">A Friend</option>
                <option value="family">A Family Member</option>
              </select>
              {formState.errors.profileFor && (
                <span className="text-red-500 text-xs mt-1">
                  {formState.errors.profileFor.message as string}
                </span>
              )}
            </div>
          )}
          {/* Progress Bar & Step Indicator */}
          {mode === "create" && (
            <div className="px-6 pt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-pink-700">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-xs text-gray-500">
                  Profile {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                  complete
                </span>
              </div>
              <Progress
                value={((currentStep + 1) / totalSteps) * 100}
                className="h-2 bg-pink-100 [&>div]:bg-pink-500"
              />
              <div className="mt-2 text-sm text-pink-600 font-semibold">
                {stepTips[currentStep]}
              </div>
            </div>
          )}
          <div className="border-b pb-4 px-6 pt-6 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800 mb-1">
                {mode === "create" ? "Create Profile" : "My Profile"}
              </h1>
              <div className="text-gray-600">
                {mode === "create"
                  ? "Welcome! Please complete your essential profile details to continue."
                  : "Update your personal details and preferences."}
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            {/* Step content */}
            <form
              onKeyDown={(e) => {
                if (e.key === "Enter" && currentStep === totalSteps - 1) {
                  e.preventDefault();
                }
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  {currentStep === 0 && (
                    <FormSection title="Basic Information">
                      <ProfileFormStepBasicInfo
                        form={form}
                        cmToFeetInches={cmToFeetInches}
                      />
                    </FormSection>
                  )}
                  {currentStep === 1 && (
                    <FormSection title="Location (UK) & Lifestyle">
                      <ProfileFormStepLocation
                        form={form}
                        ukCityOptions={ukCityOptions}
                      />
                    </FormSection>
                  )}
                  {currentStep === 2 && (
                    <FormSection title="Cultural Background">
                      <ProfileFormStepCultural form={form} />
                    </FormSection>
                  )}
                  {currentStep === 3 && (
                    <FormSection title="Education & Career">
                      <ProfileFormStepEducation form={form} />
                    </FormSection>
                  )}
                  {currentStep === 4 && (
                    <FormSection title="About & Preferences">
                      <ProfileFormStepAbout form={form} mode={mode} />
                    </FormSection>
                  )}
                  {currentStep === 5 && (
                    <FormSection
                      title="Profile Photos"
                      gridClassName="grid grid-cols-1"
                    >
                      {mode === "edit" ? (
                        <ProfileFormImageStepWrapper
                          profileId={profileId || ""}
                          images={
                            (userImages ?? []) as (ImageType | MappedImage)[]
                          }
                        />
                      ) : !userIdProp ? (
                        <div className="flex items-center gap-2 text-pink-600">
                          <LoadingSpinner size={20} />
                          Waiting for profile to be created...
                        </div>
                      ) : (
                        <ProfileFormImageStepWrapper
                          profileId={userIdProp || profileId || ""}
                          images={
                            (userImages ?? []) as (ImageType | MappedImage)[]
                          }
                        />
                      )}
                    </FormSection>
                  )}
                </motion.div>
              </AnimatePresence>
              {/* Button row: move Next button to the right */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:justify-between">
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevStep}
                      disabled={isSubmitting || loading}
                    >
                      Back
                    </Button>
                  )}
                  {mode === "edit" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onMouseEnter={() => router.prefetch("/profile")}
                      onFocus={() => router.prefetch("/profile")}
                      onClick={() => router.push("/profile")}
                      disabled={isSubmitting || loading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="flex justify-end w-full sm:w-auto">
                  {currentStep < totalSteps - 1 ? (
                    <Button
                      type="button"
                      className="bg-pink-600 hover:bg-pink-700"
                      onClick={handleNextStep}
                      disabled={isSubmitting || loading}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 px-8 py-6 text-lg font-medium"
                      loading={isSubmitting || loading}
                      disabled={!isValid}
                      onMouseEnter={() =>
                        mode === "create"
                          ? router.prefetch("/search")
                          : router.prefetch("/profile")
                      }
                      onFocus={() =>
                        mode === "create"
                          ? router.prefetch("/search")
                          : router.prefetch("/profile")
                      }
                      onClick={handleFormSubmit}
                    >
                      {buttonText}
                    </Button>
                  )}
                </div>
              </div>
              {serverError && (
                <p className="text-sm font-medium text-destructive mt-4">
                  {serverError}
                </p>
              )}
            </form>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default ProfileForm;
