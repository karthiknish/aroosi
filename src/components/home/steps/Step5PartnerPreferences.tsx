"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step5PartnerPreferences(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  preferredCitiesInput: string;
  setPreferredCitiesInput: (v: string) => void;
}) {
  const { formData, step, onChange, preferredCitiesInput, setPreferredCitiesInput } = props;
  return (
    <div className="space-y-6">
      <ValidatedSelect
        label="Preferred Gender"
        field="preferredGender"
        step={step}
        value={formData.preferredGender}
        onValueChange={(v) => onChange("preferredGender", v)}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "any", label: "Any" },
          { value: "other", label: "Other" },
        ]}
        placeholder="Select preferred gender"
        required
      />

      <div>
        <Label className="text-gray-700 mb-2 block">Age Range</Label>
        <div className="flex gap-2 items-center">
          <ValidatedInput
            label="Min"
            field="partnerPreferenceAgeMin"
            step={step}
            value={formData.partnerPreferenceAgeMin !== undefined ? String(formData.partnerPreferenceAgeMin) : ""}
            type="number"
            onValueChange={(v) => onChange("partnerPreferenceAgeMin", v === "" ? "" : Number(v))}
            className="w-24"
            placeholder="18"
          />
          <span>to</span>
          <ValidatedInput
            label="Max"
            field="partnerPreferenceAgeMax"
            step={step}
            value={formData.partnerPreferenceAgeMax !== undefined ? String(formData.partnerPreferenceAgeMax) : ""}
            type="number"
            onValueChange={(v) => onChange("partnerPreferenceAgeMax", v === "" ? "" : Number(v))}
            className="w-24"
            placeholder="99"
          />
        </div>
      </div>

      <ValidatedInput
        label="Preferred Cities"
        field="partnerPreferenceCity"
        step={step}
        value={preferredCitiesInput}
        onValueChange={async (raw) => {
          const val = String(raw);
          setPreferredCitiesInput(val);
          try {
            const { parsePreferredCities } = await import("../profileCreation/step5");
            const parsed = parsePreferredCities(val);
            onChange("partnerPreferenceCity", parsed);
          } catch {
            const parsed = val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange("partnerPreferenceCity", parsed);
          }
        }}
        placeholder="e.g. London, Kabul"
        hint="Comma-separated list"
      />
    </div>
  );
}



