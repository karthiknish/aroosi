"use client";

import React from "react";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step4EducationCareer(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
}) {
  const { formData, step, onChange } = props;
  return (
    <div className="space-y-6">
      <ValidatedInput
        label="Education"
        field="education"
        step={step}
        value={formData.education}
        onValueChange={(v) => onChange("education", v)}
        placeholder="e.g. Bachelor's, Master's"
        required
      />

      <ValidatedInput
        label="Occupation"
        field="occupation"
        step={step}
        value={formData.occupation}
        onValueChange={(v) => onChange("occupation", v)}
        placeholder="Occupation"
        required
      />

      <ValidatedInput
        label="Annual Income"
        field="annualIncome"
        step={step}
        value={formData.annualIncome}
        onValueChange={(v) => onChange("annualIncome", v)}
        placeholder="e.g. £30,000"
      />

      <ValidatedTextarea
        label="About Me"
        field="aboutMe"
        step={step}
        value={formData.aboutMe}
        onValueChange={(v) => onChange("aboutMe", v)}
        placeholder="Tell us a little about yourself..."
        rows={4}
        required
      />
    </div>
  );
}



