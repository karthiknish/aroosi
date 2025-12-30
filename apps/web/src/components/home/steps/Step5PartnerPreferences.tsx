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
    <div className="space-y-10">
      {/* Preferences Section */}
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
            className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
        />

        <div className="bg-primary/5 backdrop-blur-sm p-8 rounded-3xl border border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Heart className="w-20 h-20 text-primary" />
            </div>
            <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                    <Label className="text-neutral-dark font-bold font-sans text-sm uppercase tracking-wider opacity-70 block mb-1">Age Range</Label>
                    <p className="text-xs text-neutral-light font-medium font-sans">
                        Preferred age of your partner
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-serif font-bold text-primary">
                        {minAge} - {maxAge}
                    </span>
                    <span className="text-sm text-neutral-light font-bold font-sans ml-1">yrs</span>
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
                className="py-4"
            />
            <div className="flex justify-between text-[10px] font-bold text-neutral-light/50 mt-2 px-1 font-sans uppercase tracking-widest">
                <span>18</span>
                <span>70</span>
            </div>
        </div>
      </div>

      {/* Location Preferences */}
      <div className="space-y-6">
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
            className="h-14 bg-neutral/5 rounded-2xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
        />
      </div>
    </div>
  );
}



