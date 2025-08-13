"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step1Basic(props: {
  formData: ProfileCreationData;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
}) {
  const { formData, requiredLabel, onChange } = props;
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        <p className="text-sm text-gray-600">Tell us about yourself</p>
      </div>
      <div className="mb-6">
        <Label htmlFor="profileFor" className="text-gray-700 mb-2 block">
          {requiredLabel("This profile is for")}
        </Label>
        <Select value={formData.profileFor} onValueChange={(value) => onChange("profileFor", value)}>
          <SelectTrigger id="profileFor" className="w-full bg-white">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200">
            <SelectItem value="self">Myself</SelectItem>
            <SelectItem value="friend">Friend</SelectItem>
            <SelectItem value="family">Family</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-6">
        <Label className="text-gray-700 mb-2 block">{requiredLabel("Gender")}</Label>
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant={formData.gender === "male" ? "default" : "outline"}
            className={`w-full ${formData.gender === "male" ? "bg-pink-600 hover:bg-pink-700" : ""}`}
            onClick={() => onChange("gender", "male")}
          >
            Male
          </Button>
          <Button
            type="button"
            variant={formData.gender === "female" ? "default" : "outline"}
            className={`w-full ${formData.gender === "female" ? "bg-pink-600 hover:bg-pink-700" : ""}`}
            onClick={() => onChange("gender", "female")}
          >
            Female
          </Button>
        </div>
      </div>
    </div>
  );
}



