"use client";

import { useForm, Controller } from "react-hook-form";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, parseISO, subYears } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "@/styles/react-datepicker-custom.css";
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
import { Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import * as z from "zod";
import React from "react";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { ProfileImageReorder } from "../ProfileImageReorder";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

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

// 2. Update FormFieldProps, FormSelectFieldProps, FormDateFieldProps
type UseFormType = import("react-hook-form").UseFormReturn<ProfileFormValues>;
interface FormFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  placeholder?: string;
  type?: string;
  description?: string;
  isRequired?: boolean;
}
interface FormSelectFieldProps extends FormFieldProps {
  options: { value: string; label: string }[];
}
interface FormDateFieldProps {
  name: keyof ProfileFormValues;
  label: string;
  form: UseFormType;
  isRequired?: boolean;
  description?: string;
}

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
  const deleteImage = useMutation(api.images.deleteProfileImage);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(
    null
  );
  const updateOrder = useMutation(api.users.updateProfileImageOrder);

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
    // Use images from userImagesQuery for validation
    const validImages = (userImagesQuery || []).filter(
      (img: any) => img && img.url && img.storageId
    );
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

  const currentUserConvex = useQuery(
    api.users.getCurrentUserWithProfile,
    clerkUser?.id ? {} : "skip"
  );
  const convexUserId = currentUserConvex?._id;

  const handleImageClick = (idx: number) => {
    setModalIndex(idx);
    setModalOpen(true);
  };

  const handleDeleteImage = async (storageId: string) => {
    if (!convexUserId) return;
    setDeletingImageId(storageId);
    try {
      await deleteImage({
        userId: convexUserId,
        imageId: storageId as Id<"_storage">,
      });
      // Remove from uploadedImageIds
      const newIds = uploadedImageIds.filter((id) => id !== storageId);
      setUploadedImageIds(newIds);
      if (handleImagesChanged) handleImagesChanged(newIds);
      toast.success("Image deleted successfully");
    } catch (error) {
      toast.error("Failed to delete image");
    } finally {
      setDeletingImageId(null);
    }
  };

  // Add image query and mapping
  const userImagesQuery = useQuery(
    api.images.getProfileImages,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const storageIdToUrlMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (userImagesQuery && Array.isArray(userImagesQuery)) {
      for (const img of userImagesQuery) {
        if (img?.storageId && img?.url) {
          map[String(img.storageId)] = img.url;
        }
      }
    }
    return map;
  }, [userImagesQuery]);
  const orderedImages = uploadedImageIds.map((id) => ({
    _id: id,
    url: storageIdToUrlMap[id] || "",
  }));

  const stepTips = [
    "Tip: Use your real name and accurate details for better matches.",
    "Tip: Sharing your city helps us find matches near you.",
    "Tip: Sharing your background helps us personalize your experience.",
    "Tip: Education and career info helps you stand out.",
    "Tip: Write a friendly, honest 'About Me' to attract the right matches.",
    "Tip: A clear profile photo increases your chances by 3x!",
  ];

  // Add FormField
  const FormField: React.FC<FormFieldProps> = ({
    name,
    label,
    form,
    placeholder,
    type = "text",
    description,
    isRequired,
  }) => (
    <div>
      <Label htmlFor={name}>
        {label} {isRequired && <span className="text-red-600">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        {...form.register(name)}
        placeholder={typeof placeholder === "string" ? placeholder : undefined}
        className="mt-1"
      />
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
      {form.formState.errors[name] && (
        <p className="text-sm text-red-600 mt-1">
          {form.formState.errors[name]?.message as string}
        </p>
      )}
    </div>
  );

  // Add FormSelectField
  const FormSelectField: React.FC<FormSelectFieldProps> = ({
    name,
    label,
    form,
    placeholder,
    options,
    description,
    isRequired,
  }) => (
    <div>
      <Label htmlFor={name}>
        {label} {isRequired && <span className="text-red-600">*</span>}
      </Label>
      <Select
        onValueChange={(value) =>
          form.setValue(name, value as string, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        defaultValue={
          typeof form.getValues(name) === "string"
            ? (form.getValues(name) as string)
            : undefined
        }
      >
        <SelectTrigger id={name} className="mt-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
      {form.formState.errors[name] && (
        <p className="text-sm text-red-600 mt-1">
          {form.formState.errors[name]?.message as string}
        </p>
      )}
    </div>
  );

  // Add FormDateField
  const DatePickerCustomInput = React.forwardRef<
    HTMLButtonElement,
    { value?: string; onClick?: () => void; label: string }
  >(({ value, onClick, label }, ref) => (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal mt-1",
        !value && "text-muted-foreground"
      )}
      onClick={onClick}
      ref={ref}
    >
      <span className="mr-2">📅</span>
      {value || <span>{label}</span>}
    </Button>
  ));
  DatePickerCustomInput.displayName = "DatePickerCustomInput";
  const FormDateField: React.FC<FormDateFieldProps> = ({
    name,
    label,
    form,
    isRequired,
    description,
  }) => {
    const {
      control,
      formState: { errors },
      trigger,
    } = form;
    return (
      <div>
        <Label htmlFor={name}>
          {label} {isRequired && <span className="text-red-600">*</span>}
        </Label>
        <div className="mt-1 w-full">
          <Controller
            control={control}
            name={name}
            render={({ field }) => {
              const selectedDate =
                field.value && typeof field.value === "string"
                  ? parseISO(field.value)
                  : null;
              return (
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    if (name === "dateOfBirth") trigger("dateOfBirth");
                  }}
                  customInput={<DatePickerCustomInput label="Pick a date" />}
                  dateFormat="PPP"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={100}
                  scrollableYearDropdown
                  placeholderText="Pick a date"
                  className="w-full"
                  popperPlacement="bottom-start"
                  disabled={form.formState.isSubmitting}
                  minDate={new Date("1900-01-01")}
                  maxDate={subYears(new Date(), 18)}
                />
              );
            }}
          />
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {errors[name] && (
          <p className="text-sm text-red-600 mt-1">
            {errors[name]?.message as string}
          </p>
        )}
      </div>
    );
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
            {currentStep === 0 && (
              <FormSection title="Basic Information">
                <FormField
                  name="fullName"
                  label="Full Name"
                  form={form}
                  isRequired
                />
                <FormDateField
                  name="dateOfBirth"
                  label="Date of Birth"
                  form={form}
                  isRequired
                />
                <FormSelectField
                  name="gender"
                  label="Gender"
                  form={form}
                  placeholder="Select gender"
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                  isRequired
                />
                <div className="mb-4">
                  <Label htmlFor="height">
                    Height <span className="text-red-600">*</span>
                  </Label>
                  <Controller
                    name="height"
                    control={form.control}
                    defaultValue={form.getValues("height") || "6ft 0in"}
                    render={({ field }) => (
                      <div className="flex flex-col gap-2 mt-2">
                        <Slider
                          min={137}
                          max={198}
                          step={1}
                          value={[
                            typeof field.value === "number"
                              ? field.value
                              : Number(field.value) || 170,
                          ]}
                          onValueChange={([val]) => field.onChange(val)}
                          className="w-full my-2"
                          style={
                            {
                              "--slider-track-bg": "#fce7f3",
                              "--slider-range-bg": "#db2777",
                              "--slider-thumb-border": "#db2777",
                            } as React.CSSProperties
                          }
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>4&apos;6&quot;</span>
                          <span>6&apos;6&quot;</span>
                        </div>
                        <div className="mt-1 text-sm font-medium text-pink-700">
                          {field.value
                            ? `${cmToFeetInches(typeof field.value === "number" ? field.value : Number(field.value))} (${String(field.value)} cm)`
                            : "Select your height"}
                        </div>
                        {form.formState.errors.height && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.height.message as string}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
                <FormField
                  name="phoneNumber"
                  label="Phone Number"
                  form={form}
                  placeholder="e.g., +44 7123 456789"
                  isRequired
                />
              </FormSection>
            )}
            {currentStep === 1 && (
              <FormSection title="Location (UK) & Lifestyle">
                <FormSelectField
                  name="ukCity"
                  label="City"
                  form={form}
                  placeholder="Select city"
                  options={ukCityOptions}
                  isRequired
                />
                <FormField
                  name="ukPostcode"
                  label="Postcode"
                  form={form}
                  placeholder="e.g., SW1A 1AA"
                />
                <FormSelectField
                  name="diet"
                  label="Diet"
                  form={form}
                  placeholder="Select diet"
                  options={[
                    { value: "vegetarian", label: "Vegetarian" },
                    { value: "non-vegetarian", label: "Non-Vegetarian" },
                    { value: "vegan", label: "Vegan" },
                    { value: "eggetarian", label: "Eggetarian" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <FormSelectField
                  name="smoking"
                  label="Smoking"
                  form={form}
                  placeholder="Select smoking habit"
                  options={[
                    { value: "no", label: "No" },
                    { value: "occasionally", label: "Occasionally" },
                    { value: "yes", label: "Yes" },
                  ]}
                />
                <FormSelectField
                  name="drinking"
                  label="Drinking"
                  form={form}
                  placeholder="Select drinking habit"
                  options={[
                    { value: "no", label: "No" },
                    { value: "occasionally", label: "Occasionally" },
                    { value: "yes", label: "Yes" },
                  ]}
                />
                <FormSelectField
                  name="physicalStatus"
                  label="Physical Status"
                  form={form}
                  placeholder="Select physical status"
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "differently-abled", label: "Differently-abled" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </FormSection>
            )}
            {currentStep === 2 && (
              <FormSection title="Cultural & Religious Background">
                <FormSelectField
                  name="religion"
                  label="Religion"
                  form={form}
                  placeholder="Select religion"
                  options={[
                    { value: "islam", label: "Islam" },
                    { value: "hinduism", label: "Hinduism" },
                    { value: "christianity", label: "Christianity" },
                    { value: "sikhism", label: "Sikhism" },
                    { value: "jainism", label: "Jainism" },
                    { value: "buddhism", label: "Buddhism" },
                    { value: "judaism", label: "Judaism" },
                    { value: "other", label: "Other" },
                  ]}
                  isRequired
                />
                <FormField
                  name="caste"
                  label="Sect/Caste"
                  form={form}
                  placeholder="Optional"
                />
                <FormField
                  name="motherTongue"
                  label="Mother Tongue"
                  form={form}
                  placeholder="e.g., Urdu"
                />
                <FormSelectField
                  name="maritalStatus"
                  label="Marital Status"
                  form={form}
                  placeholder="Select status"
                  options={[
                    { value: "single", label: "Single" },
                    { value: "divorced", label: "Divorced" },
                    { value: "widowed", label: "Widowed" },
                    { value: "annulled", label: "Annulled" },
                  ]}
                />
              </FormSection>
            )}
            {currentStep === 3 && (
              <FormSection title="Education & Career">
                <FormField
                  name="education"
                  label="Education"
                  form={form}
                  placeholder="e.g., BSc Computer Science"
                />
                <FormField
                  name="occupation"
                  label="Occupation"
                  form={form}
                  placeholder="e.g., Software Engineer"
                />
                <FormField
                  name="annualIncome"
                  label="Annual Income (£)"
                  form={form}
                  type="number"
                  placeholder="e.g., 40000"
                  isRequired
                />
              </FormSection>
            )}
            {currentStep === 4 && (
              <FormSection title="About & Preferences">
                <FormField
                  name="aboutMe"
                  label="About Me"
                  form={form}
                  placeholder="Tell us about yourself..."
                  isRequired
                />
                <FormSelectField
                  name="preferredGender"
                  label="Preferred Gender"
                  form={form}
                  placeholder="Select preferred gender"
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                    { value: "any", label: "Any" },
                  ]}
                  isRequired={mode === "create"}
                />
                <FormField
                  name="partnerPreferenceAgeMin"
                  label="Min Preferred Partner Age"
                  form={form}
                  type="number"
                  placeholder="e.g., 25"
                />
                <FormField
                  name="partnerPreferenceAgeMax"
                  label="Max Preferred Partner Age"
                  form={form}
                  type="number"
                  placeholder="e.g., 35"
                />
                <FormField
                  name="partnerPreferenceReligion"
                  label="Preferred Partner Religion(s)"
                  form={form}
                  placeholder="e.g., Islam, Christianity"
                />
                <FormField
                  name="partnerPreferenceUkCity"
                  label="Preferred Partner UK City/Cities"
                  form={form}
                  placeholder="e.g., London, Manchester"
                />
              </FormSection>
            )}
            {currentStep === totalSteps - 1 && (
              <FormSection title="Profile Images">
                <div className="space-y-4">
                  {!clerkUser?.id || !convexUserId ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-500">
                        Loading user...
                      </span>
                    </div>
                  ) : (
                    <>
                      <ProfileImageUpload
                        userId={convexUserId}
                        onImagesChanged={handleImagesChanged}
                      />
                      <ProfileImageReorder
                        images={orderedImages}
                        userId={convexUserId}
                        onReorder={async (newOrder) => {
                          let newIds: string[] = [];
                          if (Array.isArray(newOrder) && newOrder.length > 0) {
                            if (typeof newOrder[0] === "string") {
                              newIds = newOrder as string[];
                            } else if (
                              typeof newOrder[0] === "object" &&
                              (newOrder[0] as any)._id
                            ) {
                              newIds = (newOrder as any[]).map((img: any) =>
                                String(img._id)
                              );
                            }
                          }
                          setUploadedImageIds(newIds);
                          handleImagesChanged(newIds);
                          // Persist to Convex
                          if (convexUserId) {
                            try {
                              await updateOrder({
                                userId: convexUserId,
                                imageIds: newIds as Id<"_storage">[],
                              });
                            } catch (error) {
                              toast.error("Failed to update image order");
                            }
                          }
                        }}
                        renderAction={(img, idx) => (
                          <div className="relative group w-20 h-20">
                            <img
                              src={img.url}
                              alt="Profile preview"
                              className="w-20 h-20 object-cover rounded-lg cursor-pointer border group-hover:brightness-90 transition"
                              onClick={() => handleImageClick(idx)}
                            />
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(String(img._id));
                              }}
                              aria-label="Delete image"
                              disabled={deletingImageId === String(img._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      />
                      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                        <DialogContent className="max-w-2xl flex flex-col items-center justify-center bg-black/90 p-0">
                          <div className="relative w-full flex items-center justify-center min-h-[400px]">
                            <button
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                              onClick={() =>
                                setModalIndex(
                                  (modalIndex - 1 + orderedImages.length) %
                                    orderedImages.length
                                )
                              }
                              aria-label="Previous image"
                              disabled={orderedImages.length <= 1}
                              style={{
                                opacity: orderedImages.length > 1 ? 1 : 0.5,
                              }}
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                            <img
                              src={orderedImages[modalIndex]?.url || ""}
                              alt="Profile large preview"
                              className="w-full h-[70vh] rounded-lg object-cover bg-black"
                              style={{ margin: "0 auto" }}
                            />
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                              onClick={() =>
                                setModalIndex(
                                  (modalIndex + 1) % orderedImages.length
                                )
                              }
                              aria-label="Next image"
                              disabled={orderedImages.length <= 1}
                              style={{
                                opacity: orderedImages.length > 1 ? 1 : 0.5,
                              }}
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                          </div>
                          <div className="text-white text-center py-2 w-full bg-black/60 rounded-b-lg">
                            {modalIndex + 1} / {orderedImages.length}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  {form.formState.errors.profileImageIds && (
                    <p className="text-sm text-red-600 mt-2">
                      {form.formState.errors.profileImageIds.message as string}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Please upload at least one clear photo of yourself. First
                    image will be your main profile picture.
                  </p>
                </div>
              </FormSection>
            )}
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
