import React from "react";
import { FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "@aroosi/shared/types";

type Props = {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  cityOptions: { value: string; label: string }[];
  countryOptions: { value: string; label: string }[];
};

const ProfileFormStepLocation: React.FC<Props> = ({
  form,
  cityOptions,
  countryOptions,
}) => (
  <>
    <FormSelectField
      name="city"
      label="City"
      form={form}
      placeholder="Select city"
      options={cityOptions}
    />
    <FormSelectField
      name="country"
      label="Country"
      form={form}
      placeholder="Select country"
      options={countryOptions}
    />
    <FormSelectField
      name="diet"
      label="Diet"
      form={form}
      placeholder="Select diet"
      options={[
        { value: "vegetarian", label: "Vegetarian" },
        { value: "non-vegetarian", label: "Non-Vegetarian" },
        { value: "eggetarian", label: "Eggetarian" },
        { value: "vegan", label: "Vegan" },
        { value: "halal", label: "Halal" },
        { value: "kosher", label: "Kosher" },
        { value: "other", label: "Other" },
      ]}
    />
    <FormSelectField
      name="smoking"
      label="Smoking"
      form={form}
      placeholder="Select smoking habit"
      options={[
        { value: "never", label: "Never" },
        { value: "occasionally", label: "Occasionally" },
        { value: "regularly", label: "Regularly" },
        { value: "socially", label: "Socially" },
      ]}
    />
    <FormSelectField
      name="drinking"
      label="Drinking"
      form={form}
      placeholder="Select drinking habit"
      options={[
        { value: "never", label: "Never" },
        { value: "occasionally", label: "Occasionally" },
        { value: "socially", label: "Socially" },
        { value: "regularly", label: "Regularly" },
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
      ]}
    />
  </>
);

export default ProfileFormStepLocation;
