import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormField, FormDateField, FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "./ProfileForm";

type Props = {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
  cmToFeetInches: (cm: number) => string;
  mode?: "create" | "edit";
};

const ProfileFormStepBasicInfo: React.FC<Props> = ({
  form,
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
        defaultValue={(() => {
          const val = form.getValues("height");
          const num = Number(val);
          return !isNaN(num) && num >= 137 && num <= 198 ? String(num) : "170";
        })()}
        render={({ field }) => {
          const numVal = Number(field.value);
          return (
            <div className="flex flex-col gap-2 mt-2">
              <Slider
                value={[numVal]}
                onValueChange={([val]) => field.onChange(String(val))}
                min={137}
                max={198}
                step={1}
                className="w-full [&>div]:bg-pink-500 [&>div[data-orientation=horizontal]]:bg-pink-500 [&>div[data-orientation=horizontal]>div]:bg-pink-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>4&apos;6&quot;</span>
                <span>6&apos;6&quot;</span>
              </div>
              <div className="mt-1 text-sm font-medium text-pink-700 bg-rose-50 border border-pink-200 rounded px-2 py-1 w-fit">
                {!isNaN(numVal) && numVal >= 137 && numVal <= 198
                  ? `${cmToFeetInches(numVal)} (${numVal} cm)`
                  : "Select your height"}
              </div>
              {form.formState.errors.height && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.height.message as string}
                </p>
              )}
            </div>
          );
        }}
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
