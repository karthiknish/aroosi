"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

// Import custom hooks for image handling
import {
  useProfileImages,
  useDeleteImage,
  type ApiImage,
} from "@/lib/utils/profileImageUtils";

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
import { useRouter } from "next/navigation";

// Types
type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say" | "other";

export type ProfileFormValues = {
  fullName: string;
  dateOfBirth: Date | string;
  gender: Gender;
  height: string;
  ukCity: string;
  aboutMe: string;
  phoneNumber: string;
  preferredGender: string;
  partnerPreferenceAgeMin: string;
  partnerPreferenceAgeMax: string;
  partnerPreferenceReligion: string;
  partnerPreferenceUkCity: string;
  religion: string;
  caste: string;
  motherTongue: string;
  maritalStatus: string;
};

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
}

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="space-y-3 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
    {children}
  </div>
);

const essentialProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.union([
    z.date(),
    z.string().min(1, "Date of birth is required"),
  ]),
  gender: z.enum(
    ["male", "female", "non-binary", "prefer-not-to-say", "other"] as const,
    {
      required_error: "Gender is required",
    }
  ),
  height: z.string().min(1, "Height is required"),
  ukCity: z.string().min(1, "City is required"),
  aboutMe: z.string().min(1, "About Me is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  preferredGender: z.string().min(1, "Preferred gender is required"),
  partnerPreferenceAgeMin: z.string(),
  partnerPreferenceAgeMax: z.string(),
  partnerPreferenceReligion: z.string(),
  partnerPreferenceUkCity: z.string(),
  religion: z.string(),
  caste: z.string(),
  motherTongue: z.string(),
  maritalStatus: z.string(),
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

const ProfileForm: React.FC<ProfileFormProps> = ({
  mode = "create",
  initialValues = {},
  onSubmit,
  loading = false,
  serverError = null,
  submitButtonText,
  userId: userIdProp,
}) => {
  const { profile } = useAuthContext();
  const router = useRouter();

  // Use userId from prop if provided, otherwise fallback to profile
  const profileId: string =
    userIdProp || (typeof profile?._id === "string" ? profile._id : "");
  const userId: string =
    userIdProp || (typeof profile?._id === "string" ? profile._id : "");

  // Form state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form
  const emptyDefaults = {
    fullName: "",
    dateOfBirth: "",
    gender: "other" as Gender,
    ukCity: "",
    aboutMe: "",
    height: "",
    phoneNumber: "",
    preferredGender: "",
    partnerPreferenceAgeMin: "",
    partnerPreferenceAgeMax: "",
    partnerPreferenceReligion: "",
    partnerPreferenceUkCity: "",
    religion: "",
    caste: "",
    motherTongue: "",
    maritalStatus: "",
  };

  // Use a ref to track if we've initialized the form to prevent unnecessary resets
  const hasInitialized = React.useRef(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(essentialProfileSchema),
    defaultValues: React.useMemo(
      () => ({
        ...emptyDefaults,
        ...(mode === "edit" ? initialValues : {}),
      }),
      [mode]
    ), // Only depends on mode, not initialValues
    mode: "onChange",
  });

  // Handle initial values update when in edit mode
  React.useEffect(() => {
    if (
      mode === "edit" &&
      !hasInitialized.current &&
      Object.keys(initialValues).length > 0
    ) {
      // Only reset if we have initialValues and haven't initialized yet
      form.reset({
        ...emptyDefaults,
        ...initialValues,
      });
      hasInitialized.current = true;
    }
  }, [mode, initialValues, form]);

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

  // Use only the hook-based approach for images and loading state:
  const imagesDataRaw = useProfileImages(profileId || "");
  const deleteImageRaw = useDeleteImage(profileId || "");
  const images: ApiImage[] = profileId ? imagesDataRaw.data || [] : [];
  const isLoadingImages: boolean = profileId ? imagesDataRaw.isLoading : false;
  const deleteImage = profileId ? deleteImageRaw : () => Promise.resolve();

  // Get initial image IDs from props or from the fetched images
  const initialImageIds = React.useMemo(() => {
    const fromProps = (initialValues as Partial<{ profileImageIds: string[] }>)
      ?.profileImageIds;
    if (fromProps?.length) return [...fromProps];
    if (images.length > 0) return images.map((img) => img.storageId);
    return [];
  }, [initialValues, images]);

  // Image state - initialize with the correct value
  const [imageOrder, setImageOrder] = useState<string[]>(initialImageIds);

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  // Handle image upload
  const handleImageUpload = async (): Promise<void> => {
    // Placeholder: implement actual upload logic or remove if not needed
    return Promise.resolve();
  };

  // Handle image delete
  const handleImageDelete = async (imageId: string) => {
    // TODO: Implement actual image delete logic here
    // This is a placeholder - replace with your actual delete implementation
    setImageOrder((prev) => prev.filter((id) => id !== imageId));
  };

  // Modal state
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] =
    useState<boolean>(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Handle image delete confirmation
  const confirmDeleteImage = useCallback(async () => {
    if (!imageToDelete) return;
    try {
      setIsSubmitting(true);
      await deleteImage(imageToDelete);
      setImageOrder((prev) => prev.filter((id) => id !== imageToDelete));
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setImageToDelete(null);
      setDeleteConfirmModalOpen(false);
      setIsSubmitting(false);
    }
  }, [imageToDelete, deleteImage]);

  // Form submission: just call onSubmit with form data and imageOrder
  const handleFormSubmit = handleSubmit((data: ProfileFormValues) => {
    onSubmit?.({ ...data, profileImageIds: imageOrder });
  });

  // Step navigation
  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };
  const handlePrevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Button text
  const buttonText =
    submitButtonText || (mode === "create" ? "Create Profile" : "Save Changes");

  // Wait for userId if needed for image upload
  const waitForUserId = mode === "create" && !userId;

  // When passing images to ProfileFormStepImages, map ApiImage[] to ImageType[]
  const mappedImages = images.map((img) => ({
    id: img.storageId, // Map storageId to id
    ...img,
  }));

  if (waitForUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
        <span className="ml-2 text-pink-700 font-semibold">
          Preparing image upload...
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
        {/* Delete Confirmation Modal */}
        {deleteConfirmModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Image
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this image? This action cannot
                be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmModalOpen(false);
                    setImageToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteImage}
                  disabled={isLoadingImages}
                >
                  {isLoadingImages ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="shadow-xl bg-white rounded-lg">
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
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
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
            <form onSubmit={handleFormSubmit}>
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
                    <FormSection title="Profile Photos">
                      {!userId ? (
                        <div className="flex items-center gap-2 text-pink-600">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Waiting for profile to be created...
                        </div>
                      ) : (
                        <ProfileFormStepImages
                          images={mappedImages}
                          onImageUpload={handleImageUpload}
                          onImageDelete={handleImageDelete}
                          isLoading={isLoadingImages}
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
                      type="submit"
                      className="w-full sm:w-auto px-8 py-6 text-lg font-medium"
                      disabled={!isValid || isSubmitting || loading}
                    >
                      {isSubmitting || loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
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
