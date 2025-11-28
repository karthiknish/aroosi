"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import { Slider } from "@/components/ui/slider";
import { cmToFeetInches } from "@/lib/utils/height";
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
    <div className="space-y-8">
      {/* Location Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <MapPin className="w-4 h-4" />
            <h3>Location Details</h3>
        </div>
        
        <div className="grid gap-4">
            <div>
                <Label htmlFor="country" className="text-gray-700 mb-2 block font-medium">
                {requiredLabel("Country")}
                </Label>
                <SearchableSelect
                options={countries.map((c) => ({ value: c, label: c }))}
                value={formData.country}
                onValueChange={(v) => onChange("country", v)}
                placeholder="Select country"
                className="w-full"
                />
                {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
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
                className="bg-white"
            />
        </div>
      </div>

      {/* Physical Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <User className="w-4 h-4" />
            <h3>Physical Attributes</h3>
        </div>

        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <Label className="text-gray-700 font-medium flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-gray-400" />
                        {requiredLabel("Height")}
                    </Label>
                    <div className="text-right">
                        <span className="text-lg font-bold text-primary block leading-none">
                            {cmToFeetInches(heightVal)}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                            {heightVal} cm
                        </span>
                    </div>
                </div>
                <Slider
                    value={[heightVal]}
                    min={137}
                    max={220}
                    step={1}
                    onValueChange={handleHeightChange}
                    className="py-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                    <span>4'6"</span>
                    <span>7'3"</span>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
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
                />
            </div>
        </div>
      </div>
    </div>
  );
}



