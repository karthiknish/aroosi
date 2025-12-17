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
        <div className="flex items-center gap-2 text-primary font-serif font-medium border-b border-neutral/10 pb-2">
            <User className="w-4 h-4" />
            <h3 className="text-lg">Basic Information</h3>
        </div>

        <div className="space-y-4">
            <div>
                <Label htmlFor="profileFor" className="text-neutral-dark mb-2 block font-medium font-sans">
                {requiredLabel("This profile is for")}
                </Label>
                <Select value={formData.profileFor} onValueChange={(value) => onChange("profileFor", value)}>
                <SelectTrigger id="profileFor" className="w-full bg-base-light/50 h-12 rounded-xl border-neutral/20 focus:ring-2 focus:ring-primary/20 transition-all">
                    <SelectValue placeholder="Select who this is for" />
                </SelectTrigger>
                <SelectContent className="bg-base-light/95 backdrop-blur-xl border border-neutral/10 shadow-xl rounded-xl">
                    <SelectItem value="self">Myself</SelectItem>
                    <SelectItem value="friend">A Friend</SelectItem>
                    <SelectItem value="family">A Family Member</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-neutral-dark mb-2 block font-medium font-sans">{requiredLabel("Gender")}</Label>
                <div className="grid grid-cols-2 gap-4">
                {["male", "female"].map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => onChange("gender", g)}
                        className={cn(
                        "relative h-12 rounded-xl border-2 transition-all duration-200 flex items-center justify-center font-medium capitalize font-sans",
                        formData.gender === g
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-neutral/10 bg-neutral/5 text-neutral-light hover:border-neutral/20 hover:bg-neutral/10"
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



