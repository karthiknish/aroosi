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
    <div className="space-y-10">
      {/* Cultural Section */}
      <div className="space-y-6">
        <div className="grid gap-6">
            <ValidatedSelect
                label="Mother Tongue"
                field="motherTongue"
                step={step}
                value={formData.motherTongue}
                onValueChange={(v) => onChange("motherTongue", v)}
                options={MOTHER_TONGUE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select language"
                className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
            />

            <ValidatedSelect
                label="Religion"
                field="religion"
                step={step}
                value={formData.religion}
                onValueChange={(v) => onChange("religion", v)}
                options={RELIGION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select religion"
                className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
            />

            <ValidatedSelect
                label="Ethnicity"
                field="ethnicity"
                step={step}
                value={formData.ethnicity}
                onValueChange={(v) => onChange("ethnicity", v)}
                options={ETHNICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select ethnicity"
                className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
            />
        </div>
      </div>

      {/* Lifestyle Section */}
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
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
                className="col-span-2 h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
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
                className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
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
                className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
            />
        </div>
      </div>
    </div>
  );
}



