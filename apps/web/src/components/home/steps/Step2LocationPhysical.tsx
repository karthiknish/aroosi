"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { Slider } from "@/components/ui/slider";
import { cmToFeetInches as robustCmToFeetInches, HEIGHT_CONSTANTS } from "@/lib/validation/heightValidation";
import type { ProfileCreationData } from "../profileCreation/types";
import { MapPin, Ruler, User } from "lucide-react";

export function Step2LocationPhysical(props: {
  formData: ProfileCreationData;
  errors: Record<string, string>;
  step: number;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
  stepValidation: { getFieldError: (f: string) => string | undefined; validateCurrentStep: () => any };
  countries: string[];
}) {
  const { formData, errors, step, requiredLabel, onChange, countries } = props;
  
  // Parse initial height
  const parseHeight = (h: string | undefined) => {
    if (!h) return 170;
    const match = h.match(/(\d+)/);
    return match ? parseInt(match[1]) : 170;
  };

  const [heightVal, setHeightVal] = useState(parseHeight(formData.height as string));

  useEffect(() => {
    setHeightVal(parseHeight(formData.height as string));
  }, [formData.height]);

  const handleHeightChange = (vals: number[]) => {
    const val = vals[0];
    setHeightVal(val);
    onChange("height", `${val} cm`);
  };

  return (
    <div className="space-y-10">
      {/* Location Section */}
      <div className="space-y-6">
        <div className="grid gap-6">
            <div>
                <Label htmlFor="country" className="text-neutral-dark mb-3 block font-bold font-sans text-sm uppercase tracking-wider opacity-70">
                {requiredLabel("Country")}
                </Label>
                <SearchableSelect
                options={countries.map((c) => ({ value: c, label: c }))}
                value={formData.country}
                onValueChange={(v) => onChange("country", v)}
                placeholder="Select country"
                className="w-full h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
                {errors.country && <p className="text-xs text-danger mt-2 font-medium animate-shake">{errors.country}</p>}
            </div>

            <ValidatedInput
                label="City"
                field="city"
                step={step}
                value={formData.city}
                onValueChange={(v) => onChange("city", v)}
                placeholder="Enter your city"
                required
                hint="Where do you currently live?"
                className="h-14 bg-neutral/5 rounded-2xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
            />
        </div>
      </div>

      {/* Physical Section */}
      <div className="space-y-8">
        <div className="space-y-6">
            <div className="bg-primary/5 backdrop-blur-sm p-8 rounded-3xl border border-primary/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Ruler className="w-20 h-20 text-primary" />
                </div>
                <div className="flex justify-between items-end mb-8 relative z-10">
                    <div>
                        <Label className="text-neutral-dark font-bold font-sans text-sm uppercase tracking-wider opacity-70 block mb-1">
                            {requiredLabel("Height")}
                        </Label>
                        <p className="text-xs text-neutral-light font-medium font-sans">
                            Slide to adjust your height
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-4xl font-serif font-bold text-primary block leading-none">
                            {robustCmToFeetInches(heightVal)}
                        </span>
                        <span className="text-sm text-neutral-light font-bold font-sans mt-1 block">
                            {heightVal} cm
                        </span>
                    </div>
                </div>
                <Slider
                    value={[heightVal]}
                    min={HEIGHT_CONSTANTS.MIN_CM}
                    max={HEIGHT_CONSTANTS.MAX_CM}
                    step={1}
                    onValueChange={handleHeightChange}
                    className="py-4"
                />
                <div className="flex justify-between text-[10px] font-bold text-neutral-light/50 mt-2 px-1 font-sans uppercase tracking-widest">
                    <span>{robustCmToFeetInches(HEIGHT_CONSTANTS.MIN_CM)}</span>
                    <span>{robustCmToFeetInches(HEIGHT_CONSTANTS.MAX_CM)}</span>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
                <ValidatedSelect
                    label="Marital Status"
                    field="maritalStatus"
                    step={step}
                    value={formData.maritalStatus}
                    onValueChange={(v) => onChange("maritalStatus", v)}
                    options={[
                    { value: "single", label: "Single" },
                    { value: "divorced", label: "Divorced" },
                    { value: "widowed", label: "Widowed" },
                    { value: "annulled", label: "Annulled" },
                    ]}
                    placeholder="Select status"
                    required
                    className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
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
                    placeholder="Select status"
                    className="h-14 rounded-2xl border-neutral/10 bg-neutral/5 focus:ring-2 focus:ring-primary/20 transition-all font-sans text-base"
                />
            </div>
        </div>
      </div>
    </div>
  );
}



