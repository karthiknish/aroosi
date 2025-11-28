"use client";

import React from "react";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedTextarea } from "@/components/ui/ValidatedTextarea";
import type { ProfileCreationData } from "../profileCreation/types";
import { Briefcase, GraduationCap, FileText } from "lucide-react";

export function Step4EducationCareer(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
}) {
  const { formData, step, onChange } = props;
  return (
    <div className="space-y-8">
      {/* Education & Career Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <GraduationCap className="w-4 h-4" />
            <h3>Education & Career</h3>
        </div>

        <div className="grid gap-4">
            <ValidatedInput
                label="Education"
                field="education"
                step={step}
                value={formData.education}
                onValueChange={(v) => onChange("education", v)}
                placeholder="e.g. Bachelor's in Computer Science"
                required
                hint="Highest level of education completed"
                className="bg-white"
            />

            <div className="grid sm:grid-cols-2 gap-4">
                <ValidatedInput
                    label="Occupation"
                    field="occupation"
                    step={step}
                    value={formData.occupation}
                    onValueChange={(v) => onChange("occupation", v)}
                    placeholder="e.g. Software Engineer"
                    required
                    className="bg-white"
                />

                <ValidatedInput
                    label="Annual Income"
                    field="annualIncome"
                    step={step}
                    value={formData.annualIncome}
                    onValueChange={(v) => onChange("annualIncome", v)}
                    placeholder="e.g. $75,000 or ₹12,00,000"
                    hint="Optional"
                    className="bg-white"
                />
            </div>
        </div>
      </div>

      {/* About Me Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <FileText className="w-4 h-4" />
            <h3>About You</h3>
        </div>

        <ValidatedTextarea
            label="About Me"
            field="aboutMe"
            step={step}
            value={formData.aboutMe}
            onValueChange={(v) => onChange("aboutMe", v)}
            placeholder="Share something about yourself - your interests, values, what makes you unique..."
            rows={5}
            required
            showCharacterCount
            maxLength={500}
            hint="Write at least 10 characters"
            className="bg-white resize-none"
        />
      </div>
    </div>
  );
}



