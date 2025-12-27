import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormSection } from "./FormSection";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import type { ProfileFormValues } from "@aroosi/shared/types";

interface EducationCareerSectionProps {
  form: UseFormReturn<Partial<ProfileFormValues>>;
}

export const EducationCareerSection: React.FC<EducationCareerSectionProps> = ({
  form,
}) => {
  const { watch, setValue } = form;

  return (
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
  );
};
