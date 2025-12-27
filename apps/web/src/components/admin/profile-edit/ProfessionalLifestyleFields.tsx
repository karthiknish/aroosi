"use client";

import React from "react";
import { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormSchema } from "@/hooks/useProfileEditFormLogic";

interface ProfessionalLifestyleFieldsProps {
  register: UseFormRegister<ProfileFormSchema>;
}

export function ProfessionalLifestyleFields({ register }: ProfessionalLifestyleFieldsProps) {
  return (
    <section>
      <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Professional & Lifestyle
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="education">
            Education
          </Label>
          <Input
            id="education"
            {...register("education")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Education"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="occupation">
            Occupation
          </Label>
          <Input
            id="occupation"
            {...register("occupation")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Occupation"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="annualIncome">
            Annual Income
          </Label>
          <Input
            id="annualIncome"
            type="number"
            {...register("annualIncome")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Annual Income"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="height">
            Height
          </Label>
          <Input
            id="height"
            {...register("height")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Height"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="maritalStatus">
            Marital Status
          </Label>
          <select
            id="maritalStatus"
            {...register("maritalStatus")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="single">Single</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="annulled">Annulled</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="diet">
            Diet
          </Label>
          <select
            id="diet"
            {...register("diet")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="non-vegetarian">Non-Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="halal">Halal</option>
            <option value="kosher">Kosher</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="smoking">
            Smoking
          </Label>
          <select
            id="smoking"
            {...register("smoking")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="never">Never</option>
            <option value="occasionally">Occasionally</option>
            <option value="regularly">Regularly</option>
            <option value="socially">Socially</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="drinking">
            Drinking
          </Label>
          <select
            id="drinking"
            {...register("drinking")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="never">Never</option>
            <option value="occasionally">Occasionally</option>
            <option value="socially">Socially</option>
            <option value="regularly">Regularly</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="physicalStatus">
            Physical Status
          </Label>
          <select
            id="physicalStatus"
            {...register("physicalStatus")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="normal">Normal</option>
            <option value="differently-abled">Differently Abled</option>
          </select>
        </div>
      </div>
    </section>
  );
}
