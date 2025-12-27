import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormSection } from "./FormSection";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import ProfileFormStepCultural from "../ProfileFormStepCultural";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import type { ProfileFormValues } from "@aroosi/shared/types";

interface CulturalLifestyleSectionProps {
  form: UseFormReturn<Partial<ProfileFormValues>>;
}

export const CulturalLifestyleSection: React.FC<CulturalLifestyleSectionProps> = ({
  form,
}) => {
  const { watch, setValue } = form;

  return (
    <FormSection title="Cultural & Lifestyle">
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

      <ProfileFormStepCultural form={form} />
    </FormSection>
  );
};
