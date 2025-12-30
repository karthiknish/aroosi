import React from "react";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  FormField,
  FormDateField,
  FormSelectField,
  FormPhoneField,
} from "./ProfileFormFields";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ProfileFormValues } from "@aroosi/shared/types";
import { HEIGHT_CONSTANTS } from "@/lib/validation/heightValidation";

type Props = {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  cmToFeetInches: (cm: number) => string;
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
        Height <span className="text-danger">*</span>
      </Label>
      <div className="mt-2">
        <Controller
          name="height"
          control={form.control}
          render={({ field }) => {
            const heightOptions = Array.from(
              { length: HEIGHT_CONSTANTS.MAX_CM - HEIGHT_CONSTANTS.MIN_CM + 1 },
              (_, i) => {
                const cm = HEIGHT_CONSTANTS.MIN_CM + i;
                return {
                  value: String(cm),
                  label: `${cmToFeetInches(cm)} (${cm} cm)`,
                };
              }
            );

            return (
              <>
                <SearchableSelect
                  options={heightOptions}
                  value={field.value as string}
                  onValueChange={field.onChange}
                  placeholder="Select height"
                  className="w-full"
                />
                {form.formState.errors.height && (
                  <p className="text-sm text-danger mt-1">
                    {form.formState.errors.height.message as string}
                  </p>
                )}
              </>
            );
          }}
        />
      </div>
    </div>
    <FormPhoneField
      name="phoneNumber"
      label="Phone Number"
      form={form}
      placeholder="7123 456789"
      isRequired
    />
  </>
);

export default ProfileFormStepBasicInfo;
