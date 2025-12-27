import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormSection } from "./FormSection";
import ProfileFormStepBasicInfo from "../ProfileFormStepBasicInfo";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import type { ProfileFormValues } from "@aroosi/shared/types";

interface BasicInfoSectionProps {
  form: UseFormReturn<Partial<ProfileFormValues>>;
  cmToFeetInches: (cm: number) => string;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  cmToFeetInches,
}) => {
  const { watch, setValue } = form;

  return (
    <FormSection title="Basic Information">
      <ProfileFormStepBasicInfo form={form} cmToFeetInches={cmToFeetInches} />
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
  );
};
