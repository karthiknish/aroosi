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
      <div className="space-y-8">
        <div className="space-y-6">
            <div>
                <Label htmlFor="profileFor" className="text-neutral-dark mb-3 block font-bold font-sans text-sm uppercase tracking-wider opacity-70">
                {requiredLabel("This profile is for")}
                </Label>
                <Select value={formData.profileFor} onValueChange={(value) => onChange("profileFor", value)}>
                <SelectTrigger id="profileFor" className="w-full bg-neutral/5 h-14 rounded-2xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all text-base">
                    <SelectValue placeholder="Select who this is for" />
                </SelectTrigger>
                <SelectContent className="bg-base-light/95 backdrop-blur-xl border border-neutral/10 shadow-2xl rounded-2xl p-1">
                    <SelectItem value="self" className="rounded-xl py-3">Myself</SelectItem>
                    <SelectItem value="friend" className="rounded-xl py-3">A Friend</SelectItem>
                    <SelectItem value="family" className="rounded-xl py-3">A Family Member</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-neutral-dark mb-3 block font-bold font-sans text-sm uppercase tracking-wider opacity-70">{requiredLabel("Gender")}</Label>
                <div className="grid grid-cols-2 gap-4">
                {[
                    { id: "male", label: "Male", icon: "♂️" },
                    { id: "female", label: "Female", icon: "♀️" }
                ].map((g) => (
                    <Button
                        key={g.id}
                        type="button"
                        variant="outline"
                        onClick={() => onChange("gender", g.id)}
                        className={cn(
                        "relative h-24 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 font-bold font-sans group overflow-hidden",
                        formData.gender === g.id
                            ? "border-primary bg-primary/5 text-primary shadow-md"
                            : "border-neutral/10 bg-neutral/5 text-neutral-light hover:border-neutral/20 hover:bg-neutral/10"
                        )}
                    >
                        <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{g.icon}</span>
                        <span className="text-sm">{g.label}</span>
                        {formData.gender === g.id && (
                        <motion.div
                            layoutId="gender-check-step1"
                            className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"
                        />
                        )}
                    </Button>
                ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}



