"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { Slider } from "@/components/ui/slider";
import type { ProfileCreationData } from "../profileCreation/types";
import { Heart, MapPin } from "lucide-react";

export function Step5PartnerPreferences(props: {
  formData: ProfileCreationData;
  step: number;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  preferredCitiesInput: string;
  setPreferredCitiesInput: (v: string) => void;
}) {
  const { formData, step, onChange, preferredCitiesInput, setPreferredCitiesInput } = props;
  
  const minAge = formData.partnerPreferenceAgeMin ?? 18;
  const maxAge = formData.partnerPreferenceAgeMax ?? 35;

  return (
    <div className="space-y-8">
      {/* Preferences Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-serif font-medium border-b border-neutral/10 pb-2">
            <Heart className="w-4 h-4" />
            <h3 className="text-lg">Partner Preferences</h3>
        </div>

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
            className="rounded-xl border-neutral/20 focus:ring-2 focus:ring-primary/20 transition-all font-sans"
        />

        <div className="bg-neutral/5 backdrop-blur-sm p-6 rounded-2xl border border-neutral/10 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <Label className="text-neutral-dark font-medium font-sans">Age Range</Label>
                <div className="text-right">
                    <span className="text-2xl font-serif font-bold text-primary">
                        {minAge} - {maxAge}
                    </span>
                    <span className="text-xs text-neutral-light ml-1 font-sans">years</span>
                </div>
            </div>
            <Slider
                value={[minAge, maxAge]}
                min={18}
                max={70}
                step={1}
                onValueChange={(vals) => {
                    onChange("partnerPreferenceAgeMin", vals[0]);
                    onChange("partnerPreferenceAgeMax", vals[1]);
                }}
                className="py-2"
            />
            <div className="flex justify-between text-xs text-neutral-light mt-3 px-1 font-sans">
                <span>18</span>
                <span>70</span>
            </div>
        </div>
      </div>

      {/* Location Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-serif font-medium border-b border-neutral/10 pb-2">
            <MapPin className="w-4 h-4" />
            <h3 className="text-lg">Location Preferences</h3>
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
            placeholder="e.g. London, Kabul, Dubai"
            hint="Enter cities separated by commas"
            className="bg-base-light/50 rounded-xl border-neutral/20 focus:ring-2 focus:ring-primary/20 transition-all font-sans"
        />
      </div>
    </div>
  );
}



