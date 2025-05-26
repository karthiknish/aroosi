import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormField, FormDateField, FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "./ProfileForm";

type Props = {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
  mode: "create" | "edit";
  cmToFeetInches: (cm: number) => string;
};

const ProfileFormStepBasicInfo: React.FC<Props> = ({
  form,
  mode,
  cmToFeetInches,
}) => (
  <>
    <FormField name="fullName" label="Full Name" form={form} isRequired />
    <FormDateField
      name="dateOfBirth"
      label="Date of Birth"
      form={form}
      isRequired
    />
    <FormSelectField
      name="gender"
      label="Gender"
      form={form}
      placeholder="Select gender"
      options={[
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
      ]}
      isRequired
    />
    <div className="mb-4">
      <Label htmlFor="height">
        Height <span className="text-red-600">*</span>
      </Label>
      <Controller
        name="height"
        control={form.control}
        defaultValue={form.getValues("height") || "6ft 0in"}
        render={({ field }) => (
          <div className="flex flex-col gap-2 mt-2">
            <Slider
              min={137}
              max={198}
              step={1}
              value={[
                typeof field.value === "number"
                  ? field.value
                  : Number(field.value) || 170,
              ]}
              onValueChange={([val]) => field.onChange(val)}
              className="w-full my-2"
              style={
                {
                  "--slider-track-bg": "#fce7f3",
                  "--slider-range-bg": "#db2777",
                  "--slider-thumb-border": "#db2777",
                } as React.CSSProperties
              }
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>4&apos;6&quot;</span>
              <span>6&apos;6&quot;</span>
            </div>
            <div className="mt-1 text-sm font-medium text-pink-700">
              {field.value
                ? `${cmToFeetInches(typeof field.value === "number" ? field.value : Number(field.value))} (${String(field.value)} cm)`
                : "Select your height"}
            </div>
            {form.formState.errors.height && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.height.message as string}
              </p>
            )}
          </div>
        )}
      />
    </div>
    <FormField
      name="phoneNumber"
      label="Phone Number"
      form={form}
      placeholder="e.g., +44 7123 456789"
      isRequired
    />
  </>
);

export default ProfileFormStepBasicInfo;
