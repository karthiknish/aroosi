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

  // Build Zod schema for edit form, mapping to EnhancedValidationSchemas
  // We validate a subset that makes sense on edit, mirroring onboarding requirements
  const editSchema = useMemo(
    () =>
      z.object({
        // Basic info
        fullName: EnhancedValidationSchemas.basicInfo.shape.fullName.optional(),
        dateOfBirth:
          EnhancedValidationSchemas.basicInfo.shape.dateOfBirth.optional(),
        gender: EnhancedValidationSchemas.basicInfo.shape.gender.optional(),
        preferredGender:
          EnhancedValidationSchemas.basicInfo.shape.preferredGender.optional(),
        // Location
        country: EnhancedValidationSchemas.location.shape.country.optional(),
        city: EnhancedValidationSchemas.location.shape.city.optional(),
        // Physical
        // Height is stored as "<cm> cm" string in UI; validate by extracting number if possible
        height: z
          .string()
          .optional()
          .refine((v) => {
            if (!v) return true;
            const match = v.match(/(\d{2,3})/);
            if (!match) return false;
            const cm = Number(match[1]);
            return cm >= 100 && cm <= 250;
          }, "Height must be between 100–250 cm"),
        maritalStatus: z
          .enum(["single", "divorced", "widowed", "annulled"])
          .optional(),
        // Lifestyle
        diet: z
          .enum(["vegetarian", "non-vegetarian", "vegan", "halal", "kosher"])
          .optional(),
        smoking: z
          .enum(["never", "occasionally", "regularly", "socially"])
          .optional(),
        drinking: z
          .enum(["never", "occasionally", "socially", "regularly"])
          .optional(),
        physicalStatus: z.enum(["normal", "differently-abled"]).optional(),
        // Professional
        education:
          EnhancedValidationSchemas.professional.shape.education.optional(),
        occupation:
          EnhancedValidationSchemas.professional.shape.occupation.optional(),
        annualIncome: z
          .union([z.string(), z.number()])
          .optional()
          .refine((val) => {
            if (val === undefined || val === "") return true;
            const n =
              typeof val === "number"
                ? val
                : Number(String(val).replace(/[^\d.-]/g, ""));
            return Number.isFinite(n) && n >= 0 && n <= 999999999;
          }, "Please enter a valid annual income"),
        // About & Contact
        aboutMe: EnhancedValidationSchemas.aboutMe.shape.aboutMe.optional(),
        phoneNumber:
          EnhancedValidationSchemas.aboutMe.shape.phoneNumber.optional(),
        // Preferences
        partnerPreferenceAgeMin: z
          .union([z.string(), z.number()])
          .optional()
          .refine((v) => {
            if (v === undefined || v === "") return true;
            const n = Number(v);
            return Number.isFinite(n) && n >= 18 && n <= 120;
          }, "Min age must be between 18 and 99"),
        partnerPreferenceAgeMax: z
          .union([z.string(), z.number()])
          .optional()
          .refine((v) => {
            if (v === undefined || v === "") return true;
            const n = Number(v);
            return Number.isFinite(n) && n >= 18 && n <= 120;
          }, "Max age must be between 18 and 120"),
        partnerPreferenceCity: z
          .union([z.array(z.string()), z.string()])
          .optional()
          .refine((v) => {
            if (!v) return true;
            const arr = Array.isArray(v)
              ? v
              : String(v)
                  .split(",")
                  .map((s) => s.trim());
            return arr.every((s) => s.length > 0 && s.length <= 50);
          }, "Preferred cities must be non-empty names"),
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

        // Normalize height to number for internal validation when possible
        if (typeof normalized.height === "string") {
          const m = normalized.height.match(/(\d{2,3})/);
          if (m) normalized.height = `${m[1]} cm`;
        }

        // Normalize phone number to +<digits> if looks valid
        if (typeof normalized.phoneNumber === "string") {
          const cleaned = normalized.phoneNumber.replace(/[^\d+]/g, "");
          const digits = cleaned.replace(/\D/g, "");
          if (digits.length >= 10 && digits.length <= 15) {
            normalized.phoneNumber = `+${digits}`;
          }
        }

        // Validate with zod
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

  // Reset form when initialValues prop changes
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length) {
      form.reset(initialValues);
      // Normalize legacy values for parity with onboarding
      const pg = (initialValues as any).preferredGender;
      if (pg === "any") {
        setValue("preferredGender", "both" as any, { shouldDirty: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const isDataReady =
    initialValues &&
    Object.values(initialValues).some((v) =>
      Array.isArray(v)
        ? v.length > 0
        : typeof v === "object"
          ? !!v
          : String(v || "").trim() !== ""
    );

  if (!isDataReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="mt-2 text-pink-700 font-medium">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        // Run Zod validation summary before submit
        const ok = await validateAll();
        if (!ok) return;

        // Normalize phone like ProfileCreationModal did
        const phone = (data.phoneNumber ?? "") as string;
        const cleaned = phone.replace(/[^\d+]/g, "");
        const digits = cleaned.replace(/\D/g, "");
        const normalizedPhone =
          digits.length >= 10 && digits.length <= 15 ? `+${digits}` : phone;

        // Persist normalized phone
        (data as any).phoneNumber = normalizedPhone;

        // Normalize partnerPreferenceCity if comma-separated string entered in helper input
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

        {/* Marital Status */}
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
            { value: "annulled", label: "Annulled" },
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

        {/* Diet */}
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

        {/* Smoking */}
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

        {/* Drinking */}
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
