import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { cmToFeetInches } from "@/lib/utils/height";
import ProfileFormStepBasicInfo from "./ProfileFormStepBasicInfo";
import ProfileFormStepLocation from "./ProfileFormStepLocation";
import ProfileFormStepCultural from "./ProfileFormStepCultural";
import ProfileFormStepEducation from "./ProfileFormStepEducation";
import ProfileFormStepAbout from "./ProfileFormStepAbout";
import { Button } from "@/components/ui/button";
import type { ProfileFormValues } from "@/types/profile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRouter } from "next/navigation";

// Reuse option sources used by ProfileCreationModal
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import { COUNTRIES } from "@/lib/constants/countries";

// Reuse validated UI used by ProfileCreationModal
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";

// Bring over validation summary/progress like onboarding
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { SimpleProgress } from "@/components/ui/ProgressIndicator";

// Validation schemas used in onboarding/profile creation
import { enhancedValidationSchemas } from "@/lib/validation/profileValidation";
import { EnhancedValidationSchemas } from "@/lib/validation/onboarding";
import * as z from "zod";

type Props = {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  loading?: boolean;
  serverError?: string | null;
  onCancel?: () => void;
  // profileId: string;
  // no image props
};

const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}> = ({ title, children, gridClassName }) => (
  <Card className="mb-6 border-0 shadow-md">
    <CardHeader>
      <CardTitle className="text-lg md:text-xl font-semibold">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent
      className={
        gridClassName || "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
      }
    >
      {children}
    </CardContent>
  </Card>
);

export default function ProfileEditSimpleForm({
  initialValues,
  onSubmit,
  loading = false,
  serverError,
  onCancel,
  // profileId: _profileId,
  // no image props
}: Props) {
  const form = useForm<Partial<ProfileFormValues>>({
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const { handleSubmit, formState, watch, setValue, getValues } = form;
  const router = useRouter();

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
    const hasMeaningfulData = Object.entries(initialValues).some(([key, value]) => {
      // Skip technical fields that don't indicate data readiness
      if (key === '_id' || key === 'userId' || key === 'profileImageIds' ||
          key === 'profileImageUrls' || key === 'createdAt' || key === 'updatedAt' ||
          key === 'banned' || key === 'profileFor') {
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
    });

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

        onSubmit(data as ProfileFormValues);
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
      {/* Basic Information (keep existing step component) */}
      <FormSection title="Basic Information">
        <ProfileFormStepBasicInfo form={form} cmToFeetInches={cmToFeetInches} />
        {/* Profile For (parity with onboarding) */}
        <ValidatedSelect
          label="Profile For"
          field="profileFor"
          step={1 as any}
          value={(watch("profileFor") as string) ?? "self"}
          onValueChange={(v) =>
            setValue("profileFor", v as any, { shouldDirty: true })
          }
          options={[
            { value: "self", label: "Myself" },
            { value: "friend", label: "Friend" },
            { value: "family", label: "Family" },
          ]}
          placeholder="Who is this profile for?"
        />
      </FormSection>

      {/* Location & Physical - align with ProfileCreationModal Step 2 */}
      <FormSection title="Location & Physical">
        {/* Country */}
        <div>
          <ValidatedSelect
            label="Country"
            field="country"
            step={2 as any}
            value={watch("country") as string}
            onValueChange={(v) =>
              setValue("country", v as any, { shouldDirty: true })
            }
            options={countries.map((c) => ({ value: c, label: c }))}
            placeholder="Select country"
          />
        </div>

        {/* City */}
        <ValidatedInput
          label="City"
          field="city"
          step={2 as any}
          value={(watch("city") as string) ?? ""}
          onValueChange={(v) =>
            setValue("city", v as any, { shouldDirty: true })
          }
          placeholder="Enter your city"
          required
          hint="Enter the city where you currently live"
        />

        {/* Height */}
        <div>
          <ValidatedSelect
            label="Height"
            field="height"
            step={2 as any}
            value={
              typeof watch("height") === "string" &&
              /^\d{2,3}$/.test(String(watch("height")).trim())
                ? `${String(watch("height")).trim()} cm`
                : ((watch("height") as string) ?? "")
            }
            onValueChange={(v) =>
              setValue("height", v as any, { shouldDirty: true })
            }
            options={Array.from({ length: 198 - 137 + 1 }, (_, i) => {
              const cm = 137 + i;
              const normalized = `${cm} cm`;
              return {
                value: normalized,
                label: `${cmToFeetInches(cm)} (${cm} cm)`,
              };
            })}
            placeholder="Select height"
          />
        </div>

        {/* Marital Status - using same options as onboarding */}
        <ValidatedSelect
          label="Marital Status"
          field="maritalStatus"
          step={2 as any}
          value={(watch("maritalStatus") as string) ?? ""}
          onValueChange={(v) =>
            setValue("maritalStatus", v as any, { shouldDirty: true })
          }
          options={[
            { value: "single", label: "Single" },
            { value: "divorced", label: "Divorced" },
            { value: "widowed", label: "Widowed" },
            { value: "separated", label: "Separated" },
          ]}
          placeholder="Select marital status"
          required
        />

        {/* Physical Status */}
        <ValidatedSelect
          label="Physical Status"
          field="physicalStatus"
          step={2 as any}
          value={(watch("physicalStatus") as string) ?? ""}
          onValueChange={(v) =>
            setValue("physicalStatus", v as any, { shouldDirty: true })
          }
          options={[
            { value: "normal", label: "Normal" },
            { value: "differently-abled", label: "Differently Abled" },
          ]}
          placeholder="Select physical status"
        />
      </FormSection>

      {/* Cultural & Lifestyle - align with ProfileCreationModal Step 3 */}
      <FormSection title="Cultural & Lifestyle">
        {/* Mother Tongue */}
        <ValidatedSelect
          label="Mother Tongue"
          field="motherTongue"
          step={3 as any}
          value={(watch("motherTongue") as string) ?? ""}
          onValueChange={(v) =>
            setValue("motherTongue", v as any, { shouldDirty: true })
          }
          options={MOTHER_TONGUE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          placeholder="Select language"
        />

        {/* Religion */}
        <ValidatedSelect
          label="Religion"
          field="religion"
          step={3 as any}
          value={(watch("religion") as string) ?? ""}
          onValueChange={(v) =>
            setValue("religion", v as any, { shouldDirty: true })
          }
          options={RELIGION_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          placeholder="Select religion"
        />

        {/* Ethnicity */}
        <ValidatedSelect
          label="Ethnicity"
          field="ethnicity"
          step={3 as any}
          value={(watch("ethnicity") as string) ?? ""}
          onValueChange={(v) =>
            setValue("ethnicity", v as any, { shouldDirty: true })
          }
          options={ETHNICITY_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          placeholder="Select ethnicity"
        />

        {/* Diet - using same options as onboarding */}
        <ValidatedSelect
          label="Diet"
          field="diet"
          step={3 as any}
          value={(watch("diet") as string) ?? ""}
          onValueChange={(v) =>
            setValue("diet", v as any, { shouldDirty: true })
          }
          options={[
            { value: "vegetarian", label: "Vegetarian" },
            { value: "non-vegetarian", label: "Non-Vegetarian" },
            { value: "vegan", label: "Vegan" },
            { value: "halal", label: "Halal" },
            { value: "kosher", label: "Kosher" },
          ]}
          placeholder="Select diet preference"
        />

        {/* Smoking - using same options as onboarding */}
        <ValidatedSelect
          label="Smoking"
          field="smoking"
          step={3 as any}
          value={(watch("smoking") as string) ?? ""}
          onValueChange={(v) =>
            setValue("smoking", v as any, { shouldDirty: true })
          }
          options={[
            { value: "never", label: "Never" },
            { value: "occasionally", label: "Occasionally" },
            { value: "regularly", label: "Regularly" },
            { value: "socially", label: "Socially" },
          ]}
          placeholder="Select smoking preference"
        />

        {/* Drinking - using same options as onboarding */}
        <ValidatedSelect
          label="Drinking"
          field="drinking"
          step={3 as any}
          value={(watch("drinking") as string) ?? ""}
          onValueChange={(v) =>
            setValue("drinking", v as any, { shouldDirty: true })
          }
          options={[
            { value: "never", label: "Never" },
            { value: "occasionally", label: "Occasionally" },
            { value: "socially", label: "Socially" },
            { value: "regularly", label: "Regularly" },
          ]}
          placeholder="Select drinking preference"
        />
      </FormSection>

      {/* Education & Career - align with Step 4 */}
      <FormSection title="Education & Career">
        <ValidatedInput
          label="Education"
          field="education"
          step={4 as any}
          value={(watch("education") as string) ?? ""}
          onValueChange={(v) =>
            setValue("education", v as any, { shouldDirty: true })
          }
          placeholder="e.g. Bachelor's, Master's"
          required
        />

        <ValidatedInput
          label="Occupation"
          field="occupation"
          step={4 as any}
          value={(watch("occupation") as string) ?? ""}
          onValueChange={(v) =>
            setValue("occupation", v as any, { shouldDirty: true })
          }
          placeholder="Occupation"
          required
        />

        <ValidatedInput
          label="Annual Income"
          field="annualIncome"
          step={4 as any}
          value={String((watch("annualIncome") as any) ?? "")}
          onValueChange={(v) =>
            setValue("annualIncome", v as any, { shouldDirty: true })
          }
          placeholder="e.g. £30,000"
        />
      </FormSection>

      {/* About & Preferences - align with Step 4/5 */}
      <FormSection title="About & Preferences">
        <ValidatedTextarea
          label="About Me"
          field="aboutMe"
          step={4 as any}
          value={(watch("aboutMe") as string) ?? ""}
          onValueChange={(v) =>
            setValue("aboutMe", v as any, { shouldDirty: true })
          }
          placeholder="Tell us a little about yourself..."
          rows={4}
          required
        />

        {/* Preferred Gender - using same options as onboarding */}
        <ValidatedSelect
          label="Preferred Gender"
          field="preferredGender"
          step={5 as any}
          value={(watch("preferredGender") as string) ?? ""}
          onValueChange={(v) =>
            setValue("preferredGender", v as any, { shouldDirty: true })
          }
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "both", label: "Both" },
            { value: "other", label: "Other" },
          ]}
          placeholder="Select preferred gender"
          required
        />

        {/* Age range */}
        <div className="grid grid-cols-1 md:grid-cols-[auto,auto,auto] items-end gap-2">
          <ValidatedInput
            label="Preferred Age Min"
            field="partnerPreferenceAgeMin"
            step={5 as any}
            value={
              (watch("partnerPreferenceAgeMin") as any) !== undefined
                ? String(watch("partnerPreferenceAgeMin") as any)
                : ""
            }
            type="number"
            onValueChange={(v) =>
              setValue(
                "partnerPreferenceAgeMin",
                (v === "" ? "" : Number(v)) as any,
                {
                  shouldDirty: true,
                }
              )
            }
            className="w-24"
            placeholder="18"
          />
          <div className="hidden md:block text-center mb-2">to</div>
          <ValidatedInput
            label="Preferred Age Max"
            field="partnerPreferenceAgeMax"
            step={5 as any}
            value={
              (watch("partnerPreferenceAgeMax") as any) !== undefined
                ? String(watch("partnerPreferenceAgeMax") as any)
                : ""
            }
            type="number"
            onValueChange={(v) =>
              setValue(
                "partnerPreferenceAgeMax",
                (v === "" ? "" : Number(v)) as any,
                {
                  shouldDirty: true,
                }
              )
            }
            className="w-24"
            placeholder="120"
          />
        </div>

        {/* Preferred Cities helper input (comma separated) */}
        <ValidatedInput
          label="Preferred Cities"
          field="partnerPreferenceCity"
          step={5 as any}
          value={preferredCitiesInput}
          validationValue={preferredCitiesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)}
          onValueChange={(raw) => {
            const str = String(raw);
            setPreferredCitiesInput(str);
            const parsed = str
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            setValue("partnerPreferenceCity", parsed as any, {
              shouldDirty: true,
            });
          }}
          placeholder="e.g. London, Kabul"
          hint="Comma-separated list"
        />
      </FormSection>

      {/* Profile photos are edited on a separate page, same as onboarding */}

      {serverError && (
        <p className="text-sm font-medium text-destructive mt-4">
          {serverError}
        </p>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 py-3 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel ? onCancel : () => router.back()}
            className="min-w-[120px]"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formState.isDirty}
            className="min-w-[140px] flex items-center justify-center"
          >
            {loading && <LoadingSpinner size={18} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
