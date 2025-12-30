import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormSection } from "./FormSection";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import type { ProfileFormValues } from "@aroosi/shared/types";
import { HEIGHT_CONSTANTS } from "@/lib/validation/heightValidation";

interface LocationPhysicalSectionProps {
  form: UseFormReturn<Partial<ProfileFormValues>>;
  countries: string[];
  cmToFeetInches: (cm: number) => string;
}

export const LocationPhysicalSection: React.FC<LocationPhysicalSectionProps> = ({
  form,
  countries,
  cmToFeetInches,
}) => {
  const { watch, setValue } = form;

  return (
    <FormSection title="Location & Physical">
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
          options={Array.from({ length: HEIGHT_CONSTANTS.MAX_CM - HEIGHT_CONSTANTS.MIN_CM + 1 }, (_, i) => {
            const cm = HEIGHT_CONSTANTS.MIN_CM + i;
            const normalized = `${cm} cm`;
            return {
              value: normalized,
              label: `${cmToFeetInches(cm)} (${cm} cm)`,
            };
          })}
          placeholder="Select height"
        />
      </div>

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
  );
};
