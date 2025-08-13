"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step3CulturalLifestyle(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  stepValidation: { getFieldError: (f: string) => string | undefined };
}) {
  const { formData, step, onChange, stepValidation } = props;
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="motherTongue" className="text-gray-700 mb-2 block">
          Mother Tongue
        </Label>
        <div
          className={`rounded-md ${
            formData.motherTongue
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("motherTongue")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="motherTongue"
            step={step}
            value={formData.motherTongue}
            onValueChange={(v) => onChange("motherTongue", v)}
            options={MOTHER_TONGUE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select language"
            className="bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="religion" className="text-gray-700 mb-2 block">
          Religion
        </Label>
        <div
          className={`rounded-md ${
            formData.religion
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("religion")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="religion"
            step={step}
            value={formData.religion}
            onValueChange={(v) => onChange("religion", v)}
            options={RELIGION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select religion"
            className="bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ethnicity" className="text-gray-700 mb-2 block">
          Ethnicity
        </Label>
        <div
          className={`rounded-md ${
            formData.ethnicity
              ? "ring-1 ring-green-500 border-green-500"
              : stepValidation.getFieldError("ethnicity")
                ? "ring-1 ring-red-500 border-red-500"
                : ""
          }`}
        >
          <ValidatedSelect
            label=""
            field="ethnicity"
            step={step}
            value={formData.ethnicity}
            onValueChange={(v) => onChange("ethnicity", v)}
            options={ETHNICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Select ethnicity"
            className="bg-white"
          />
        </div>
      </div>

      <ValidatedSelect
        label="Diet"
        field="diet"
        step={step}
        value={formData.diet}
        onValueChange={(v) => onChange("diet", v)}
        options={[
          { value: "vegetarian", label: "Vegetarian" },
          { value: "non-vegetarian", label: "Non-Vegetarian" },
          { value: "halal", label: "Halal Only" },
          { value: "other", label: "Other" },
        ]}
        placeholder="Select diet preference"
      />

      <ValidatedSelect
        label="Smoking"
        field="smoking"
        step={step}
        value={formData.smoking}
        onValueChange={(v) => onChange("smoking", v)}
        options={[
          { value: "no", label: "No" },
          { value: "occasionally", label: "Occasionally" },
          { value: "yes", label: "Yes" },
        ]}
        placeholder="Select smoking preference"
      />

      <ValidatedSelect
        label="Drinking"
        field="drinking"
        step={step}
        value={formData.drinking}
        onValueChange={(v) => onChange("drinking", v)}
        options={[
          { value: "no", label: "No" },
          { value: "occasionally", label: "Occasionally" },
          { value: "yes", label: "Yes" },
        ]}
        placeholder="Select drinking preference"
      />
    </div>
  );
}



