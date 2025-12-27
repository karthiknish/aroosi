"use client";

import React from "react";
import { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormSchema } from "@/hooks/useProfileEditFormLogic";

interface CulturalReligiousFieldsProps {
  register: UseFormRegister<ProfileFormSchema>;
}

export function CulturalReligiousFields({ register }: CulturalReligiousFieldsProps) {
  return (
    <section>
      <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Cultural & Religious
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="motherTongue">
            Mother Tongue
          </Label>
          <select
            id="motherTongue"
            {...register("motherTongue")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="farsi-dari">Farsi/Dari</option>
            <option value="pashto">Pashto</option>
            <option value="uzbeki">Uzbeki</option>
            <option value="hazaragi">Hazaragi</option>
            <option value="turkmeni">Turkmeni</option>
            <option value="balochi">Balochi</option>
            <option value="nuristani">Nuristani</option>
            <option value="punjabi">Punjabi</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="religion">
            Religion
          </Label>
          <Input
            id="religion"
            {...register("religion")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Religion"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="ethnicity">
            Ethnicity
          </Label>
          <select
            id="ethnicity"
            {...register("ethnicity")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="">(Unspecified)</option>
            <option value="tajik">Tajik</option>
            <option value="pashtun">Pashtun</option>
            <option value="uzbek">Uzbek</option>
            <option value="hazara">Hazara</option>
            <option value="turkmen">Turkmen</option>
            <option value="baloch">Baloch</option>
            <option value="nuristani">Nuristani</option>
            <option value="aimaq">Aimaq</option>
            <option value="pashai">Pashai</option>
            <option value="qizilbash">Qizilbash</option>
            <option value="punjabi">Punjabi</option>
          </select>
        </div>
      </div>
    </section>
  );
}
