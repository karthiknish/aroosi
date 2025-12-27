"use client";

import React from "react";
import { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormSchema } from "@/hooks/useProfileEditFormLogic";

interface PartnerPreferenceFieldsProps {
  register: UseFormRegister<ProfileFormSchema>;
}

export function PartnerPreferenceFields({ register }: PartnerPreferenceFieldsProps) {
  return (
    <section>
      <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Partner Preferences
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceAgeMin">
              Min Age
            </Label>
            <Input
              id="partnerPreferenceAgeMin"
              type="number"
              {...register("partnerPreferenceAgeMin")}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceAgeMax">
              Max Age
            </Label>
            <Input
              id="partnerPreferenceAgeMax"
              type="number"
              {...register("partnerPreferenceAgeMax")}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="preferredGender">
            Preferred Gender
          </Label>
          <select
            id="preferredGender"
            {...register("preferredGender")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="both">Both</option>
            <option value="other">Other</option>
            <option value="">(Unspecified)</option>
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="partnerPreferenceCity">
            Preferred Cities
          </Label>
          <Input
            id="partnerPreferenceCity"
            {...register("partnerPreferenceCity")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="e.g. London, Kabul, Dubai"
          />
        </div>
      </div>
    </section>
  );
}
