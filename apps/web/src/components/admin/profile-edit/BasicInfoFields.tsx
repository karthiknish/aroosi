"use client";

import React from "react";
import { UseFormRegister, FieldErrors, Control, Controller } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ProfileFormSchema } from "@/hooks/useProfileEditFormLogic";

interface BasicInfoFieldsProps {
  register: UseFormRegister<ProfileFormSchema>;
  errors: FieldErrors<ProfileFormSchema>;
  control: Control<ProfileFormSchema>;
  countries: string[];
}

export function BasicInfoFields({
  register,
  errors,
  control,
  countries,
}: BasicInfoFieldsProps) {
  return (
    <section>
      <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Personal Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="fullName">
            Full Name
          </Label>
          <Input
            id="fullName"
            {...register("fullName")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="Full name"
          />
          {errors.fullName && (
            <p className="text-danger text-xs font-medium">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="dateOfBirth">
            Date of Birth
          </Label>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => {
              const dateValue = field.value ? new Date(field.value as string) : undefined;
              const today = new Date();
              const maxDate = new Date(
                today.getFullYear() - 18,
                today.getMonth(),
                today.getDate()
              );
              const minDate = new Date("1900-01-01");

              return (
                <DatePicker
                  date={dateValue}
                  setDate={(date) => {
                    if (!date || isNaN(date.getTime())) return;
                    field.onChange(format(date, "yyyy-MM-dd"));
                  }}
                  minDate={minDate}
                  maxDate={maxDate}
                  error={!!errors.dateOfBirth}
                  className="bg-base-light h-[42px] rounded-xl border-neutral/20"
                />
              );
            }}
          />
          {errors.dateOfBirth && (
            <p className="text-danger text-xs font-medium">{errors.dateOfBirth.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="gender">
            Gender
          </Label>
          <select
            id="gender"
            {...register("gender")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="phoneNumber">
            Phone Number
          </Label>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <PhoneInput
                inputId="phoneNumber"
                value={field.value as string}
                onChange={field.onChange}
                placeholder="Phone number"
                className="w-full"
                error={!!errors.phoneNumber}
              />
            )}
          />
          {errors.phoneNumber && (
            <p className="text-danger text-xs font-medium">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="city">
            City
          </Label>
          <Input
            id="city"
            {...register("city")}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="City"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="country">
            Country
          </Label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={countries.map((c) => ({ value: c, label: c }))}
                value={(field.value as string) || ""}
                onValueChange={(v) => field.onChange(v)}
                placeholder="Select country"
                className="w-full"
              />
            )}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-semibold text-neutral-dark" htmlFor="aboutMe">
            About Me
          </Label>
          <Textarea
            id="aboutMe"
            {...register("aboutMe")}
            className="w-full px-4 py-3 rounded-xl border border-neutral/20 bg-base-light text-neutral-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[120px]"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>
    </section>
  );
}
