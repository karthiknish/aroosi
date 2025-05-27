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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";

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

// 3. Update UnifiedProfileFormProps
type ClerkUser = { id: string; [key: string]: unknown };
export interface UnifiedProfileFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  clerkUser?: ClerkUser;
  loading?: boolean;
  serverError?: string | null;
  onEditDone?: () => void;
}

// Add Zod schema for validation
const essentialProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Gender is required",
  }),
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

const ProfileForm: React.FC<UnifiedProfileFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  clerkUser,
  loading = false,
  serverError = null,
  onEditDone,
}) => {
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
  const [currentStep, setCurrentStep] = React.useState(0);
  const [uploadedImageIds, setUploadedImageIds] = React.useState<string[]>(
    initialValues?.profileImageIds || []
  );
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalIndex, setModalIndex] = React.useState(0);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(
    null
  );
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
    const valid = await form.trigger(
      stepFields as (keyof ProfileFormValues)[],
      { shouldFocus: true }
    );
    if (valid) setCurrentStep((s: number) => Math.min(s + 1, totalSteps - 1));
  };
  const handlePrevious = () =>
    setCurrentStep((s: number) => Math.max(s - 1, 0));

  // 5. Update handleSubmit signature
  const handleSubmit = async (values: ProfileFormValues) => {
    // Use images from userImages for validation
    function isValidImage(
      img: unknown
    ): img is { url: string; storageId: string } {
      return (
        typeof img === "object" &&
        img !== null &&
        "url" in img &&
        typeof (img as { url: unknown }).url === "string" &&
        "storageId" in img &&
        typeof (img as { storageId: unknown }).storageId === "string"
      );
    }
    const validImages = (userImages || []).filter(isValidImage);
    // Check if we're on the image upload step and no images are uploaded
    if (mode === "create" && currentStep === 4 && validImages.length === 0) {
      form.setError("profileImageIds", {
        type: "manual",
        message: "Please upload at least one profile image",
      });
      return;
    }

    // If we're submitting the final form, ensure we have images
    if (
      mode === "create" &&
      currentStep === totalSteps - 1 &&
      validImages.length === 0
    ) {
      form.setError("profileImageIds", {
        type: "manual",
        message: "Please upload at least one profile image before submitting",
      });
      setCurrentStep(4); // Go to the images step
      return;
    }

    // Convert annualIncome to number if present
    if (values.annualIncome !== undefined && values.annualIncome !== null) {
      values.annualIncome = Number(values.annualIncome);
    }

    // Convert height to '5ft 7in' string if present
    if (
      values.height !== undefined &&
      values.height !== null &&
      values.height !== ""
    ) {
      values.height = cmToFeetInchesString(Number(values.height));
    }

    // Convert partnerPreferenceAgeMin and partnerPreferenceAgeMax to numbers or undefined
    if (
      typeof values.partnerPreferenceAgeMin === "string" &&
      values.partnerPreferenceAgeMin === ""
    ) {
      values.partnerPreferenceAgeMin = undefined;
    } else if (typeof values.partnerPreferenceAgeMin === "string") {
      values.partnerPreferenceAgeMin = Number(values.partnerPreferenceAgeMin);
    }
    if (
      typeof values.partnerPreferenceAgeMax === "string" &&
      values.partnerPreferenceAgeMax === ""
    ) {
      values.partnerPreferenceAgeMax = undefined;
    } else if (typeof values.partnerPreferenceAgeMax === "string") {
      values.partnerPreferenceAgeMax = Number(values.partnerPreferenceAgeMax);
    }

    // Convert partnerPreferenceReligion to array of strings or undefined
    if (
      values.partnerPreferenceReligion === undefined ||
      values.partnerPreferenceReligion === null ||
      (Array.isArray(values.partnerPreferenceReligion) &&
        values.partnerPreferenceReligion.length === 0) ||
      (typeof values.partnerPreferenceReligion === "string" &&
        values.partnerPreferenceReligion === "")
    ) {
      values.partnerPreferenceReligion = undefined;
    } else if (typeof values.partnerPreferenceReligion === "string") {
      values.partnerPreferenceReligion = (
        values.partnerPreferenceReligion as string
      )
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      if ((values.partnerPreferenceReligion as string[]).length === 0) {
        values.partnerPreferenceReligion = undefined;
      }
    }

    // Convert partnerPreferenceUkCity to array of strings or undefined
    if (
      values.partnerPreferenceUkCity === undefined ||
      values.partnerPreferenceUkCity === null ||
      (Array.isArray(values.partnerPreferenceUkCity) &&
        values.partnerPreferenceUkCity.length === 0) ||
      (typeof values.partnerPreferenceUkCity === "string" &&
        values.partnerPreferenceUkCity === "")
    ) {
      values.partnerPreferenceUkCity = undefined;
    } else if (typeof values.partnerPreferenceUkCity === "string") {
      values.partnerPreferenceUkCity = (
        values.partnerPreferenceUkCity as string
      )
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      if ((values.partnerPreferenceUkCity as string[]).length === 0) {
        values.partnerPreferenceUkCity = undefined;
      }
    }

    await onSubmit({ ...values, profileImageIds: uploadedImageIds });
    // removed setShowSuccessModal
    // Remove draft from localStorage after successful submit
    if (mode === "create") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const handleImagesChanged = React.useCallback((newImageIds: string[]) => {
    setUploadedImageIds(newImageIds);
    // removed setImagesVersion
  }, []);

  const { getToken } = useAuth();
  const [convexUserId, setConvexUserId] = React.useState<string | null>(null);
  const [userImages, setUserImages] = React.useState<
    {
      url: string;
      storageId: string;
    }[]
  >([]);
  const [loadingImages, setLoadingImages] = React.useState(false);

  React.useEffect(() => {
    async function fetchUserId() {
      if (!clerkUser?.id) return;
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConvexUserId(data?.profile?.userId || null);
      }
    }
    fetchUserId();
  }, [clerkUser?.id, getToken]);

  React.useEffect(() => {
    async function fetchImages() {
      if (!convexUserId) return;
      setLoadingImages(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/profile-detail/${convexUserId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserImages(data.userProfileImages || []);
      } else {
        setUserImages([]);
      }
      setLoadingImages(false);
    }
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexUserId]);

  const handleDeleteImage = async (storageId: string) => {
    if (!convexUserId) return;
    const token = await getToken();
    if (!token) {
      toast.error("No authentication token");
      return;
    }
    await deleteImage(convexUserId, storageId, token);
  };

  const handleReorderImages = async (userId: string, imageIds: string[]) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/images/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, imageIds }),
      });
      if (!res.ok) throw new Error("Failed to update image order");
      toast.success("Image order updated");
    } catch {
      toast.error("Failed to update image order");
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
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
                    {convexUserId ? (
                      <ProfileFormStepImages
                        form={form}
                        clerkUser={clerkUser}
                        convexUserId={convexUserId}
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
                        toast={toast}
                        loading={loadingImages}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded" />
                      </div>
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
                    disabled={loading}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="bg-pink-600 hover:bg-pink-700"
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={loading}
                  >
                    {loading ? (
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
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default ProfileForm;
