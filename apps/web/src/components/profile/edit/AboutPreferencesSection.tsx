import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormSection } from "./FormSection";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";
import type { ProfileFormValues } from "@aroosi/shared/types";

interface AboutPreferencesSectionProps {
  form: UseFormReturn<Partial<ProfileFormValues>>;
  preferredCitiesInput: string;
  setPreferredCitiesInput: (v: string) => void;
}

export const AboutPreferencesSection: React.FC<AboutPreferencesSectionProps> = ({
  form,
  preferredCitiesInput,
  setPreferredCitiesInput,
}) => {
  const { watch, setValue } = form;

  return (
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
  );
};
