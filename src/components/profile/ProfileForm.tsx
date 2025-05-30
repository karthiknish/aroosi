"use client";

import { useForm } from "react-hook-form";

import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import "react-datepicker/dist/react-datepicker.css";
import "@/styles/react-datepicker-custom.css";
import { Button } from "@/components/ui/button";

import { Loader2 } from "lucide-react";

import * as z from "zod";
import React from "react";

import { Progress } from "@/components/ui/progress";

import { Image } from "@/components/ProfileImageReorder";

import ProfileFormStepBasicInfo from "./ProfileFormStepBasicInfo";
import ProfileFormStepLocation from "./ProfileFormStepLocation";
import ProfileFormStepCultural from "./ProfileFormStepCultural";
import ProfileFormStepEducation from "./ProfileFormStepEducation";
import ProfileFormStepAbout from "./ProfileFormStepAbout";
import ProfileFormStepImages from "./ProfileFormStepImages";
import { useToken } from "@/components/TokenProvider";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";
import {
  fetchUserProfileImages,
  submitProfile,
} from "@/lib/profile/userProfileApi";

// Hardcoded list of major UK cities
const majorUkCities = [
  "Belfast",
  "Birmingham",
  "Bradford",
  "Brighton",
  "Bristol",
  "Cambridge",
  "Cardiff",
  "Coventry",
  "Derby",
  "Edinburgh",
  "Glasgow",
  "Kingston upon Hull",
  "Leeds",
  "Leicester",
  "Liverpool",
  "London",
  "Manchester",
  "Milton Keynes",
  "Newcastle upon Tyne",
  "Newport",
  "Norwich",
  "Nottingham",
  "Oxford",
  "Plymouth",
  "Portsmouth",
  "Preston",
  "Reading",
  "Sheffield",
  "Southampton",
  "Stoke-on-Trent",
  "Sunderland",
  "Swansea",
  "Wakefield",
  "Wolverhampton",
  "York",
];
const ukCityOptions = majorUkCities
  .sort()
  .map((city) => ({ value: city, label: city }));

// 1. Define ProfileFormValues
export interface ProfileFormValues {
  userId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  height?: string;
  phoneNumber: string;
  ukCity: string;
  ukPostcode?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe: string;
  preferredGender?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  profileImageIds?: string[];
  isProfileComplete?: boolean;
}

// Helper components
export const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="space-y-3 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
    {children}
  </div>
);
export const DisplaySection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="space-y-1 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

// Add Zod schema for validation
const essentialProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Gender is required",
  }),
  height: z.string().min(1, "Height is required"),
  ukCity: z.string().min(1, "City is required"),
  aboutMe: z.string().min(1, "About Me is required"),
});

function cmToFeetInches(cm: number) {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}\"`;
}

function cmToFeetInchesString(cm: number) {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}ft ${inches}in`;
}

// Phone number validation regex (UK/international)
const phoneRegex = /^\+?\d{10,15}$/;

const LOCAL_STORAGE_KEY = "aroosi-profile-draft";

// TODO: Replace 'any' with the correct type if available
const ProfileForm: React.FC<{
  mode: "create" | "edit";
  initialValues?: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => void;
  loading?: boolean;
  serverError?: string | null;
  onEditDone: () => void;
  onProfileCreated?: () => void;
}> = ({
  mode,
  initialValues,
  onSubmit,
  loading = false,
  serverError = null,
  onEditDone,
  onProfileCreated,
}) => {
  const token = useToken();
  const { isProfileComplete, refetchProfile } = useProfileCompletion();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [uploadedImageIds, setUploadedImageIds] = React.useState<string[]>(
    initialValues?.profileImageIds || []
  );
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalIndex, setModalIndex] = React.useState(0);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(
    null
  );
  const [reordering, setReordering] = React.useState(false);
  const [creatingProfile, setCreatingProfile] = React.useState(false);
  const [waitForUserId, setWaitForUserId] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] =
    React.useState(false);
  const [imageToDelete, setImageToDelete] = React.useState<string | null>(null);

  // Step configuration
  const profileStepLogic = [
    {
      title: "Basic Information",
      fields: ["fullName", "dateOfBirth", "gender", "height", "phoneNumber"],
    },
    {
      title: "Location (UK) & Lifestyle",
      fields: [
        "ukCity",
        "ukPostcode",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ],
    },
    {
      title: "Cultural & Religious Background",
      fields: ["religion", "caste", "motherTongue", "maritalStatus"],
    },
    {
      title: "Education & Career",
      fields: ["education", "occupation", "annualIncome"],
    },
    {
      title: "About & Preferences",
      fields: [
        "aboutMe",
        "preferredGender",
        "partnerPreferenceAgeMin",
        "partnerPreferenceAgeMax",
        "partnerPreferenceReligion",
        "partnerPreferenceUkCity",
      ],
    },
    {
      title: "Profile Images",
      fields: ["profileImageIds"],
    },
  ];
  const totalSteps = profileStepLogic.length;

  const deleteImage = async (
    userId: string,
    imageId: string,
    token: string
  ) => {
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, imageId }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setDeletingImageId(null);
    }
  };

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: async (data) => {
      try {
        essentialProfileSchema.parse(data);
        return { values: data, errors: {} };
      } catch (err) {
        return {
          values: {},
          errors: (err as z.ZodError).formErrors?.fieldErrors || {},
        };
      }
    },
    defaultValues: initialValues || {
      fullName: "",
      dateOfBirth: "",
      gender: undefined,
      ukCity: "",
      ukPostcode: "",
      religion: "",
      caste: "",
      motherTongue: "",
      height: undefined,
      maritalStatus: undefined,
      education: "",
      occupation: "",
      annualIncome: undefined,
      aboutMe: "",
      preferredGender: undefined,
      partnerPreferenceAgeMin: undefined,
      partnerPreferenceAgeMax: undefined,
      partnerPreferenceReligion: [],
      partnerPreferenceUkCity: [],
      profileImageIds: [],
      phoneNumber: "",
      diet: undefined,
      smoking: undefined,
      drinking: undefined,
      physicalStatus: undefined,
    },
  });

  // On mount, prefill from localStorage if available (only for create mode)
  React.useEffect(() => {
    if (mode === "create") {
      const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          Object.entries(parsed).forEach(([key, value]) => {
            if (form.getValues(key as keyof ProfileFormValues) !== value) {
              form.setValue(
                key as keyof ProfileFormValues,
                value as string | number | string[] | undefined
              );
            }
          });
        } catch {}
      }
    }
    // eslint-disable-next-line
  }, []);

  // Persist form data to localStorage on change (only for create mode)
  React.useEffect(() => {
    if (mode === "create") {
      const subscription = form.watch((values) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
      });
      return () => subscription.unsubscribe();
    }
  }, [form, mode]);

  // Step navigation
  const handleNextStep = async () => {
    const stepFields = profileStepLogic[currentStep].fields;
    // If on the Basic Information step, validate phone number
    if (currentStep === 0) {
      const phone = form.getValues("phoneNumber");
      if (!phoneRegex.test(phone)) {
        form.setError("phoneNumber", {
          type: "manual",
          message: "Please enter a valid phone number (e.g., +447123456789)",
        });
        return;
      }
    }

    // If on the About & Preferences step, validate minimum age
    if (currentStep === 4) {
      const minAge = form.getValues("partnerPreferenceAgeMin");
      if (minAge && minAge < 18) {
        form.setError("partnerPreferenceAgeMin", {
          type: "manual",
          message: "Minimum preferred partner age must be 18 or above",
        });
        return;
      }
    }

    const valid = await form.trigger(
      stepFields as (keyof ProfileFormValues)[],
      { shouldFocus: true }
    );
    if (!valid) return;

    // If this is the last non-image step, fetch userId
    if (currentStep === totalSteps - 2 && mode === "create") {
      setCreatingProfile(true);
      try {
        if (onProfileCreated) {
          onProfileCreated();
          setWaitForUserId(true);
          return; // Do not advance step yet
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create profile"
        );
      } finally {
        setCreatingProfile(false);
      }
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep((s: number) => Math.min(s + 1, totalSteps - 1));
    }
  };

  // 2. Use userId only if it exists in image-related effects and handlers
  const userId = initialValues?.userId;

  // Debug log for userId propagation
  React.useEffect(() => {
    console.log("[ProfileForm] userId:", userId);
  }, [userId]);

  // Effect: when waitForUserId && userId, advance step
  React.useEffect(() => {
    if (waitForUserId && userId) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
      setWaitForUserId(false);
    }
  }, [waitForUserId, userId, totalSteps]);

  const handlePrevious = () =>
    setCurrentStep((s: number) => Math.max(s - 1, 0));

  // 5. Update handleSubmit signature
  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      setSaving(true);
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Validate minimum age
      if (
        values.partnerPreferenceAgeMin &&
        values.partnerPreferenceAgeMin < 18
      ) {
        toast.error("Minimum preferred partner age must be 18 or above");
        setSaving(false);
        return;
      }

      if (mode === "edit") {
        await submitProfile(token, values, "edit");
        if (onSubmit) {
          onSubmit(values);
        }
        onEditDone();
      } else {
        // In create mode, submit the profile
        await submitProfile(token, values, "create");
        if (onProfileCreated) {
          onProfileCreated();
        }
      }
    } catch (error) {
      console.error("Error submitting profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      );
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const [userImages, setUserImages] = React.useState<
    {
      url: string;
      storageId: string;
    }[]
  >([]);
  const [loadingImages, setLoadingImages] = React.useState(false);

  // 2. Use userId only if it exists in image-related effects and handlers
  React.useEffect(() => {
    if (!userId) return;
    setLoadingImages(true);
    fetchUserProfileImages(token!, userId)
      .then((data) => {
        console.log(
          "[ProfileForm] Fetched userProfileImages after upload:",
          data.userProfileImages
        );
        setUserImages(data.userProfileImages || []);
      })
      .catch(() => setUserImages([]))
      .finally(() => setLoadingImages(false));
  }, [token, userId]);

  const handleDeleteImage = async (storageId: string) => {
    if (!userId) return;
    setImageToDelete(storageId);
    setDeleteConfirmModalOpen(true);
  };

  const confirmDeleteImage = async () => {
    if (!userId || !imageToDelete) return;
    setLoadingImages(true);
    try {
      await deleteImage(userId, imageToDelete, token!);
      // Refetch images after delete
      const data = await fetchUserProfileImages(token!, userId);
      console.log(
        "[ProfileForm] Fetched userProfileImages after delete:",
        data.userProfileImages
      );
      const newImages = data.userProfileImages || [];
      setUserImages(newImages);
      // Update the uploadedImageIds to match the new images
      setUploadedImageIds(
        newImages.map(
          (img: { storageId: string; url: string }) => img.storageId
        )
      );
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setLoadingImages(false);
      setDeleteConfirmModalOpen(false);
      setImageToDelete(null);
    }
  };

  const handleReorderImages = async (userId: string, imageIds: string[]) => {
    if (loadingImages || reordering) return; // Block reorder if loading or already reordering
    setReordering(true);
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/images/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token!}`,
        },
        body: JSON.stringify({ userId, imageIds }),
      });
      if (!res.ok) throw new Error("Failed to update image order");
      toast.success("Image order updated");
      // Refetch images after reorder
      const data = await fetchUserProfileImages(token!, userId);
      console.log(
        "[ProfileForm] Fetched userProfileImages after upload:",
        data.userProfileImages
      );
      setUserImages(data.userProfileImages || []);
    } catch {
      toast.error("Failed to update image order");
    }
    setLoadingImages(false);
    setReordering(false);
  };

  const storageIdToUrlMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (userImages && Array.isArray(userImages)) {
      for (const img of userImages) {
        if (img?.storageId && img?.url) {
          map[String(img.storageId)] = img.url;
        }
      }
    }
    return map;
  }, [userImages]);
  const orderedImages: Image[] = uploadedImageIds.map((id) => ({
    _id: id,
    url: storageIdToUrlMap[id] || "",
    storageId: id,
  }));

  const stepTips = [
    "Tip: Use your real name and accurate details for better matches.",
    "Tip: Sharing your city helps us find matches near you.",
    "Tip: Sharing your background helps us personalize your experience.",
    "Tip: Education and career info helps you stand out.",
    "Tip: Write a friendly, honest 'About Me' to attract the right matches.",
    "Tip: A clear profile photo increases your chances by 3x!",
  ];

  // Add handleImageClick definition
  const handleImageClick = (idx: number) => {
    setModalIndex(idx);
    setModalOpen(true);
  };

  const handleImagesChanged = React.useCallback(
    async (newImageIds: string[]) => {
      setUploadedImageIds(newImageIds);
      // After image upload, fetch the latest image URLs from the backend (create mode)
      if (mode === "create" && userId && newImageIds.length > 0) {
        try {
          const data = await fetchUserProfileImages(token!, userId);
          console.log(
            "[ProfileForm] Fetched userProfileImages after upload:",
            data.userProfileImages
          );
          // Map newImageIds to their URLs
          const urlMap: Record<string, string> = {};
          (data.userProfileImages || []).forEach(
            (img: { storageId: string; url: string }) => {
              urlMap[img.storageId] = img.url;
            }
          );
          setUserImages(
            newImageIds.map((id) => ({
              storageId: id,
              url: urlMap[id] || "",
            }))
          );
        } catch {
          // fallback: just set storageIds
          setUserImages(newImageIds.map((id) => ({ storageId: id, url: "" })));
        }
      }
    },
    [mode, userId, token]
  );

  if (waitForUserId && !userId) {
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
                  disabled={loadingImages}
                >
                  {loadingImages ? (
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
            <form onSubmit={(e) => e.preventDefault()}>
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
                        mode={mode}
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
                    <FormSection title="Cultural & Religious Background">
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
                  {currentStep === totalSteps - 1 && (
                    <FormSection title="Profile Images">
                      {/* Only render image upload step if userId is present */}
                      {!userId ? (
                        <div className="flex items-center gap-2 text-pink-600">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Waiting for profile to be created...
                        </div>
                      ) : (
                        <ProfileFormStepImages
                          form={form}
                          userId={userId}
                          handleImagesChanged={handleImagesChanged}
                          orderedImages={orderedImages}
                          handleImageClick={handleImageClick}
                          handleDeleteImage={handleDeleteImage}
                          deletingImageId={deletingImageId}
                          modalOpen={modalOpen}
                          setModalOpen={setModalOpen}
                          modalIndex={modalIndex}
                          setModalIndex={setModalIndex}
                          updateOrder={({ userId, imageIds }) =>
                            handleReorderImages(userId, imageIds)
                          }
                          loading={loadingImages}
                          reordering={reordering}
                          mode={mode}
                        />
                      )}
                    </FormSection>
                  )}
                </motion.div>
              </AnimatePresence>
              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t mt-8">
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={loading}
                    >
                      Previous
                    </Button>
                  )}
                  {mode === "edit" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onEditDone}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentStep < totalSteps - 1 ? (
                    <Button
                      type="button"
                      className="bg-pink-600 hover:bg-pink-700"
                      onClick={handleNextStep}
                      disabled={loading || creatingProfile}
                    >
                      {creatingProfile ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Next"
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="bg-pink-600 hover:bg-pink-700"
                      onClick={() => {
                        const values = form.getValues();
                        handleSubmit(values);
                      }}
                    >
                      {loading || saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Save Profile"
                      )}
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
