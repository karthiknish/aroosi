"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ProfileCreationData } from "../profileCreation/types";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Step1Basic(props: {
  formData: ProfileCreationData;
  requiredLabel: (label: string) => React.ReactNode;
  onChange: (field: keyof ProfileCreationData, value: any) => void;
}) {
  const { formData, requiredLabel, onChange } = props;
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
            <User className="w-4 h-4" />
            <h3>Basic Information</h3>
        </div>

        <div className="space-y-4">
            <div>
                <Label htmlFor="profileFor" className="text-gray-700 mb-2 block font-medium">
                {requiredLabel("This profile is for")}
                </Label>
                <Select value={formData.profileFor} onValueChange={(value) => onChange("profileFor", value)}>
                <SelectTrigger id="profileFor" className="w-full bg-white h-12">
                    <SelectValue placeholder="Select who this is for" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                    <SelectItem value="self">Myself</SelectItem>
                    <SelectItem value="friend">A Friend</SelectItem>
                    <SelectItem value="family">A Family Member</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-gray-700 mb-2 block font-medium">{requiredLabel("Gender")}</Label>
                <div className="grid grid-cols-2 gap-4">
                {["male", "female"].map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => onChange("gender", g)}
                        className={cn(
                        "relative h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-medium capitalize",
                        formData.gender === g
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-gray-100 bg-gray-50/50 text-gray-600 hover:border-gray-200 hover:bg-gray-100"
                        )}
                    >
                        {g}
                        {formData.gender === g && (
                        <motion.div
                            layoutId="gender-check-step1"
                            className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"
                        />
                        )}
                    </button>
                ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}



