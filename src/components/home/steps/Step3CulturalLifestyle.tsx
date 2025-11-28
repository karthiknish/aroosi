"use client";

import React from "react";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import {
  MOTHER_TONGUE_OPTIONS,
  RELIGION_OPTIONS,
  ETHNICITY_OPTIONS,
} from "@/lib/constants/languages";
import type { ProfileCreationData } from "../profileCreation/types";
import { Globe, Wine } from "lucide-react";

export function Step3CulturalLifestyle(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  stepValidation: { getFieldError: (f: string) => string | undefined };
}) {
  const { formData, step, onChange } = props;

  return (
    <div className="space-y-8">
      {/* Cultural Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <Globe className="w-4 h-4" />
            <h3>Cultural Background</h3>
        </div>
        
        <div className="grid gap-4">
            <ValidatedSelect
                label="Mother Tongue"
                field="motherTongue"
                step={step}
                value={formData.motherTongue}
                onValueChange={(v) => onChange("motherTongue", v)}
                options={MOTHER_TONGUE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select language"
            />

            <ValidatedSelect
                label="Religion"
                field="religion"
                step={step}
                value={formData.religion}
                onValueChange={(v) => onChange("religion", v)}
                options={RELIGION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select religion"
            />

            <ValidatedSelect
                label="Ethnicity"
                field="ethnicity"
                step={step}
                value={formData.ethnicity}
                onValueChange={(v) => onChange("ethnicity", v)}
                options={ETHNICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select ethnicity"
            />
        </div>
      </div>

      {/* Lifestyle Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <Wine className="w-4 h-4" />
            <h3>Lifestyle Choices</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
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
                placeholder="Select diet"
                className="col-span-2"
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
                placeholder="Select preference"
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
                placeholder="Select preference"
            />
        </div>
      </div>
    </div>
  );
}



