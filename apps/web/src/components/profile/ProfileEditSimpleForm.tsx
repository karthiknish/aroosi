import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { cmToFeetInches } from "@/lib/validation/heightValidation";
import type { ProfileFormValues } from "@aroosi/shared/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRouter } from "next/navigation";

// Reuse option sources used by ProfileCreationModal
import { COUNTRIES } from "@/lib/constants/countries";

// Bring over validation summary/progress like onboarding
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { SimpleProgress } from "@/components/ui/ProgressIndicator";

// Validation schemas used in onboarding/profile creation
import { enhancedValidationSchemas } from "@/lib/validation/profileValidation";
import * as z from "zod";

// Extracted components
import { BasicInfoSection } from "./edit/BasicInfoSection";
import { LocationPhysicalSection } from "./edit/LocationPhysicalSection";
import { CulturalLifestyleSection } from "./edit/CulturalLifestyleSection";
import { EducationCareerSection } from "./edit/EducationCareerSection";
import { AboutPreferencesSection } from "./edit/AboutPreferencesSection";
import { StickyActionBar } from "./edit/StickyActionBar";

type Props = {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  onAutoSave?: (values: ProfileFormValues) => Promise<void>;
  onValuesChange?: (values: Partial<ProfileFormValues>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  loading?: boolean;
  serverError?: string | null;
  onCancel?: () => void;
  autoSaveStatus?: "idle" | "saving" | "saved" | "error";
};

export default function ProfileEditSimpleForm({
  initialValues,
  onSubmit,
  onAutoSave,
  onValuesChange,
  onDirtyChange,
  loading = false,
  serverError,
  onCancel,
  autoSaveStatus = "idle",
}: Props) {
  const form = useForm<Partial<ProfileFormValues>>({
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const { handleSubmit, formState, watch, setValue, getValues } = form;
  const router = useRouter();

  // Notify parent of dirty state
  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
  }, [formState.isDirty, onDirtyChange]);

  // LocalStorage backup & Server Auto-save
  const watchedValues = watch();

  // Notify parent of value changes for preview
  useEffect(() => {
    onValuesChange?.(watchedValues as Partial<ProfileFormValues>);
  }, [watchedValues, onValuesChange]);

  useEffect(() => {
    if (formState.isDirty) {
      const timer = setTimeout(async () => {
        // 1. LocalStorage backup (immediate safety)
        localStorage.setItem(
          "profile_edit_backup",
          JSON.stringify(watchedValues)
        );

        // 2. Server Auto-save (if valid)
        if (onAutoSave) {
          const isValid = await validateAll();
          if (isValid) {
            // Normalize values before auto-save
            const data = { ...watchedValues };

            // Handle partnerPreferenceCity like onboarding
            if (preferredCitiesInput) {
              const parsed = String(preferredCitiesInput)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              (data as any).partnerPreferenceCity = parsed;
            }

            // Ensure consistent value normalization
            if ((data as any).preferredGender === "both") {
              (data as any).preferredGender = "any";
            }

            onAutoSave(data as ProfileFormValues);
          }
        }
      }, 3000); // 3 second debounce for server auto-save
      return () => clearTimeout(timer);
    }
  }, [watchedValues, formState.isDirty, onAutoSave]);

  // Load from localStorage on mount if available and user confirms
  useEffect(() => {
    const backup = localStorage.getItem("profile_edit_backup");
    if (backup && !formState.isDirty) {
      try {
        const parsed = JSON.parse(backup);
        // Simple check to see if backup is different from initial
        if (JSON.stringify(parsed) !== JSON.stringify(initialValues)) {
          if (
            window.confirm(
              "You have unsaved changes from a previous session. Would you like to restore them?"
            )
          ) {
            form.reset(parsed);
          } else {
            localStorage.removeItem("profile_edit_backup");
          }
        }
      } catch (e) {
        console.error("Failed to parse profile backup", e);
      }
    }
  }, []); // Only on mount

  // Clear backup on successful submit
  const handleFormSubmit = async (data: any) => {
    localStorage.removeItem("profile_edit_backup");
    onSubmit(data);
  };

  // Build Zod schema for edit form, using the same schemas as onboarding
  const editSchema = useMemo(
    () =>
      z.object({
        // Basic info - using same validation as hero onboarding
        fullName: enhancedValidationSchemas.basicInfo.shape.fullName.optional(),
        dateOfBirth:
          enhancedValidationSchemas.basicInfo.shape.dateOfBirth.optional(),
        gender: enhancedValidationSchemas.basicInfo.shape.gender.optional(),
        phoneNumber:
          enhancedValidationSchemas.basicInfo.shape.phoneNumber.optional(),
        profileFor:
          enhancedValidationSchemas.basicInfo.shape.profileFor.optional(),

        // Location - using same validation as profile creation modal
        country: enhancedValidationSchemas.location.shape.country.optional(),
        city: enhancedValidationSchemas.location.shape.city.optional(),

        // Physical - using same validation as profile creation modal
        height: enhancedValidationSchemas.location.shape.height.optional(),
        maritalStatus:
          enhancedValidationSchemas.location.shape.maritalStatus.optional(),
        physicalStatus:
          enhancedValidationSchemas.location.shape.physicalStatus.optional(),

        // Cultural - using same validation as profile creation modal
        motherTongue:
          enhancedValidationSchemas.cultural.shape.motherTongue.optional(),
        religion: enhancedValidationSchemas.cultural.shape.religion.optional(),
        ethnicity:
          enhancedValidationSchemas.cultural.shape.ethnicity.optional(),
        diet: enhancedValidationSchemas.cultural.shape.diet.optional(),
        smoking: enhancedValidationSchemas.cultural.shape.smoking.optional(),
        drinking: enhancedValidationSchemas.cultural.shape.drinking.optional(),
        religiousPractice:
          enhancedValidationSchemas.cultural.shape.religiousPractice.optional(),
        familyValues:
          enhancedValidationSchemas.cultural.shape.familyValues.optional(),
        marriageViews:
          enhancedValidationSchemas.cultural.shape.marriageViews.optional(),
        traditionalValues:
          enhancedValidationSchemas.cultural.shape.traditionalValues.optional(),

        // Professional - using same validation as profile creation modal
        education:
          enhancedValidationSchemas.education.shape.education.optional(),
        occupation:
          enhancedValidationSchemas.education.shape.occupation.optional(),
        annualIncome:
          enhancedValidationSchemas.education.shape.annualIncome.optional(),

        // About - using same validation as profile creation modal
        aboutMe: enhancedValidationSchemas.education.shape.aboutMe.optional(),

        // Preferences - using same validation as profile creation modal
        preferredGender:
          enhancedValidationSchemas.preferencesBase.shape.preferredGender.optional(),
        partnerPreferenceAgeMin:
          enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceAgeMin.optional(),
        partnerPreferenceAgeMax:
          enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceAgeMax.optional(),
        partnerPreferenceCity:
          enhancedValidationSchemas.preferencesBase.shape.partnerPreferenceCity.optional(),
      }),
    []
  );

  // Error aggregation state for ErrorSummary
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>(
    {}
  );
  const [isValidating, setIsValidating] = useState(false);

  const validateAll = useMemo(
    () => async (): Promise<boolean> => {
      setIsValidating(true);
      try {
        const values = getValues();
        // Build a normalized snapshot similar to onboarding
        const normalized = { ...values };

        // Normalize height: convert "150 cm" to 150 cm format for validation
        if (typeof normalized.height === "string") {
          const heightMatch = normalized.height.match(/(\d{2,3})/);
          if (heightMatch) {
            normalized.height = `${heightMatch[1]} cm`;
          }
        }

        // Normalize phone number to E.164 format like onboarding
        if (typeof normalized.phoneNumber === "string") {
          const cleaned = normalized.phoneNumber.replace(/[^\d+]/g, "");
          const digits = cleaned.replace(/\D/g, "");
          if (digits.length >= 10 && digits.length <= 15) {
            normalized.phoneNumber = `+${digits}`;
          }
        }

        // Normalize age preferences to numbers
        if (typeof normalized.partnerPreferenceAgeMin === "string") {
          const num = Number(normalized.partnerPreferenceAgeMin);
          if (!isNaN(num)) normalized.partnerPreferenceAgeMin = num;
        }
        if (typeof normalized.partnerPreferenceAgeMax === "string") {
          const num = Number(normalized.partnerPreferenceAgeMax);
          if (!isNaN(num)) normalized.partnerPreferenceAgeMax = num;
        }

        // Validate with zod using onboarding schemas
        const res = editSchema.safeParse(normalized);
        if (!res.success) {
          const errs: Record<string, string> = {};
          for (const issue of res.error.issues) {
            const key = issue.path[0] as string;
            if (key) errs[key] = issue.message;
          }
          setSummaryErrors(errs);
          return false;
        }

        setSummaryErrors({});
        return true;
      } finally {
        setIsValidating(false);
      }
    },
    [editSchema, getValues]
  );

  // Build comprehensive country list like ProfileCreationModal
  const countries = useMemo(() => COUNTRIES.map((c) => c.name).sort(), []);
  const [preferredCitiesInput, setPreferredCitiesInput] = useState<string>("");

  // Mirror Hero/ProfileCreationModal height normalization UX
  const heightValue = watch("height");
  useEffect(() => {
    if (typeof heightValue === "string") {
      const raw = heightValue.trim();
      if (/^\d{2,3}$/.test(raw)) {
        setValue("height", `${raw} cm`, { shouldDirty: true });
      }
    }
  }, [heightValue, setValue]);

  // Reset form when initialValues prop changes - normalize like onboarding
  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues);

      // Normalize values to match onboarding format for consistency

      // Handle preferredGender: convert "any" to "both" for UI consistency
      const pg = (initialValues as any).preferredGender;
      if (pg === "any") {
        setValue("preferredGender", "both" as any, { shouldDirty: false });
      }

      // Handle legacy lifestyle values like onboarding normalization
      const diet = (initialValues as any).diet;
      if (diet === "non_vegetarian") {
        setValue("diet", "non-vegetarian" as any, { shouldDirty: false });
      }

      const smoking = (initialValues as any).smoking;
      if (smoking === "no")
        setValue("smoking", "never" as any, { shouldDirty: false });
      if (smoking === "yes")
        setValue("smoking", "regularly" as any, { shouldDirty: false });

      const drinking = (initialValues as any).drinking;
      if (drinking === "no")
        setValue("drinking", "never" as any, { shouldDirty: false });
      if (drinking === "yes")
        setValue("drinking", "regularly" as any, { shouldDirty: false });

      // Handle partnerPreferenceCity array to comma-separated string for UI
      const cities = (initialValues as any).partnerPreferenceCity;
      if (Array.isArray(cities) && cities.length > 0) {
        setPreferredCitiesInput(cities.join(", "));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // Update isDataReady logic to handle edge cases better
  const isDataReady = useMemo(() => {
    if (!initialValues) return false;

    // If we have initialValues, check if it has any meaningful data
    const hasMeaningfulData = Object.entries(initialValues).some(
      ([key, value]) => {
        // Skip technical fields that don't indicate data readiness
        if (
          key === "_id" ||
          key === "userId" ||
          key === "profileImageIds" ||
          key === "profileImageUrls" ||
          key === "createdAt" ||
          key === "updatedAt" ||
          key === "banned" ||
          key === "profileFor"
        ) {
          return false;
        }

        if (Array.isArray(value)) {
          return value.length > 0;
        }

        if (typeof value === "object" && value !== null) {
          return Object.keys(value).length > 0;
        }

        if (typeof value === "string" || typeof value === "number") {
          return String(value).trim().length > 0;
        }

        return !!value;
      }
    );

    return hasMeaningfulData;
  }, [initialValues]);

  if (!isDataReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-primary" />
        <span className="mt-2 text-primary-dark font-medium">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        // Run the same validation as onboarding before submit
        const ok = await validateAll();
        if (!ok) return;

        // Normalize phone number like onboarding/profile creation
        const phone = (data.phoneNumber ?? "") as string;
        const cleaned = phone.replace(/[^\d+]/g, "");
        const digits = cleaned.replace(/\D/g, "");
        const normalizedPhone =
          digits.length >= 10 && digits.length <= 15 ? `+${digits}` : phone;
        (data as any).phoneNumber = normalizedPhone;

        // Normalize height to match onboarding format
        if (typeof data.height === "string") {
          const heightMatch = data.height.match(/(\d{2,3})/);
          if (heightMatch) {
            (data as any).height = `${heightMatch[1]} cm`;
          }
        }

        // Normalize age preferences to numbers like onboarding
        if (typeof data.partnerPreferenceAgeMin === "string") {
          const num = Number(data.partnerPreferenceAgeMin);
          if (!isNaN(num)) (data as any).partnerPreferenceAgeMin = num;
        }
        if (typeof data.partnerPreferenceAgeMax === "string") {
          const num = Number(data.partnerPreferenceAgeMax);
          if (!isNaN(num)) (data as any).partnerPreferenceAgeMax = num;
        }

        // Handle partnerPreferenceCity like onboarding (comma-separated string to array)
        if (
          preferredCitiesInput &&
          Array.isArray(data.partnerPreferenceCity) === false
        ) {
          const parsed = String(preferredCitiesInput)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          (data as any).partnerPreferenceCity = parsed;
        }

        // Ensure consistent value normalization like onboarding
        if ((data as any).preferredGender === "both") {
          (data as any).preferredGender = "any"; // Convert back to API format
        }

        handleFormSubmit(data as ProfileFormValues);
      })}
      className="space-y-8 w-full max-w-4xl mx-auto pb-24"
    >
      {/* Top validation UI parity with onboarding */}
      <div className="pt-2">
        <SimpleProgress
          current={Object.keys(summaryErrors).length === 0 ? 1 : 0}
          total={1}
        />
        <div className="mt-3">
          <ErrorSummary
            isValid={Object.keys(summaryErrors).length === 0}
            progress={Object.keys(summaryErrors).length === 0 ? 100 : 0}
            requiredFields={[
              "fullName",
              "dateOfBirth",
              "gender",
              "preferredGender",
              "country",
              "city",
              "height",
              "maritalStatus",
              "education",
              "occupation",
              "aboutMe",
              "phoneNumber",
            ]}
            completedFields={Object.keys(getValues() || {}).filter((k) => {
              const v = (getValues() as any)[k];
              if (Array.isArray(v)) return v.length > 0;
              if (v === undefined || v === null) return false;
              if (typeof v === "string") return v.trim().length > 0;
              return true;
            })}
            errors={summaryErrors}
          />
        </div>
      </div>

      <BasicInfoSection form={form} cmToFeetInches={cmToFeetInches} />

      <LocationPhysicalSection
        form={form}
        countries={countries}
        cmToFeetInches={cmToFeetInches}
      />

      <CulturalLifestyleSection form={form} />

      <EducationCareerSection form={form} />

      <AboutPreferencesSection
        form={form}
        preferredCitiesInput={preferredCitiesInput}
        setPreferredCitiesInput={setPreferredCitiesInput}
      />

      {serverError && (
        <p className="text-sm font-medium text-destructive mt-4">
          {serverError}
        </p>
      )}

      <StickyActionBar
        autoSaveStatus={autoSaveStatus}
        isDirty={formState.isDirty}
        loading={loading}
        onCancel={onCancel ? onCancel : () => router.back()}
      />
    </form>
  );
}
