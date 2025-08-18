"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { cmToFeetInches } from "@/lib/utils/height";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step2LocationPhysical(props: {
  formData: ProfileCreationData;
  errors: Record<string, string>;
  step: number;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  stepValidation: { getFieldError: (f: string) => string | undefined; validateCurrentStep: () => any };
  countries: string[];
}) {
  const { formData, errors, step, requiredLabel, onChange, stepValidation, countries } = props;
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="country" className="text-gray-700 mb-2 block">
          {requiredLabel("Country")}
        </Label>
        <SearchableSelect
          options={countries.map((c) => ({ value: c, label: c }))}
          value={formData.country}
          onValueChange={(v) => onChange("country", v)}
          placeholder="Select country"
          aria-invalid={!!errors.country}
          aria-describedby={errors.country ? "country-error" : undefined}
        />
      </div>

      <ValidatedInput
        label="City"
        field="city"
        step={step}
        value={formData.city}
        onValueChange={(v) => onChange("city", v)}
        placeholder="Enter your city"
        required
        hint="Enter the city where you currently live"
      />

      <div>
        <Label htmlFor="height" className="text-gray-700 mb-2 block">
          {requiredLabel("Height")}
        </Label>
        <div
          className={`rounded-md ${
            formData.height
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("height")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <SearchableSelect
            options={Array.from({ length: 198 - 137 + 1 }, (_, i) => {
              const cm = 137 + i;
              const normalized = `${cm} cm`;
              return {
                value: normalized,
                label: `${cmToFeetInches(cm)} (${cm} cm)`,
              };
            })}
            value={
              typeof formData.height === "string" &&
              /^\d{2,3}$/.test(formData.height.trim())
                ? `${formData.height.trim()} cm`
                : formData.height
            }
            onValueChange={(v) => {
              const normalized =
                typeof v === "string"
                  ? /^\d{2,3}$/.test(v.trim())
                    ? `${v.trim()} cm`
                    : v
                  : v;
              onChange("height", normalized as string);
              void stepValidation.validateCurrentStep();
            }}
            placeholder="Select height"
            className="bg-white"
          />
        </div>
      </div>

      <ValidatedSelect
        label="Marital Status"
        field="maritalStatus"
        className="bg-white text-neutral"
        step={step}
        value={formData.maritalStatus}
        onValueChange={(v) => onChange("maritalStatus", v)}
        options={[
          { value: "single", label: "Single" },
          { value: "divorced", label: "Divorced" },
          { value: "widowed", label: "Widowed" },
          { value: "annulled", label: "Annulled" },
        ]}
        placeholder="Select marital status"
        required
      />

      <ValidatedSelect
        label="Physical Status"
        field="physicalStatus"
        step={step}
        value={formData.physicalStatus}
        onValueChange={(v) => onChange("physicalStatus", v)}
        options={[
          { value: "normal", label: "Normal" },
          { value: "differently-abled", label: "Differently Abled" },
        ]}
        placeholder="Select physical status"
      />
    </div>
  );
}



