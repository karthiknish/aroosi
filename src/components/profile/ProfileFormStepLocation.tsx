import React from "react";
import { FormField, FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "@/types/profile";

type Props = {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  ukCityOptions: { value: string; label: string }[];
};

const ProfileFormStepLocation: React.FC<Props> = ({ form, ukCityOptions }) => (
  <>
    <FormSelectField
      name="ukCity"
      label="UK City"
      form={form}
      placeholder="Select UK city"
      options={ukCityOptions}
      isRequired
    />
    <FormField
      name="ukPostcode"
      label="Postcode"
      form={form}
      placeholder="e.g., SW1A 1AA"
    />
    <FormSelectField
      name="diet"
      label="Diet"
      form={form}
      placeholder="Select diet"
      options={[
        { value: "vegetarian", label: "Vegetarian" },
        { value: "non-vegetarian", label: "Non-Vegetarian" },
        { value: "vegan", label: "Vegan" },
        { value: "eggetarian", label: "Eggetarian" },
        { value: "other", label: "Other" },
      ]}
    />
    <FormSelectField
      name="smoking"
      label="Smoking"
      form={form}
      placeholder="Select smoking habit"
      options={[
        { value: "no", label: "No" },
        { value: "occasionally", label: "Occasionally" },
        { value: "yes", label: "Yes" },
      ]}
    />
    <FormSelectField
      name="drinking"
      label="Drinking"
      form={form}
      placeholder="Select drinking habit"
      options={[
        { value: "no", label: "No" },
        { value: "occasionally", label: "Occasionally" },
        { value: "yes", label: "Yes" },
      ]}
    />
    <FormSelectField
      name="physicalStatus"
      label="Physical Status"
      form={form}
      placeholder="Select physical status"
      options={[
        { value: "normal", label: "Normal" },
        { value: "differently-abled", label: "Differently-abled" },
        { value: "other", label: "Other" },
      ]}
    />
  </>
);

export default ProfileFormStepLocation;
