import React from "react";
import { FormField, FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "@/types/profile";

type Props = {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  mode: "create" | "edit";
};

const ProfileFormStepAbout: React.FC<Props> = ({ form, mode }) => (
  <>
    <FormField
      name="aboutMe"
      label="About Me"
      form={form}
      placeholder="Tell us about yourself..."
      isRequired
      textarea
    />
    <FormSelectField
      name="preferredGender"
      label="Preferred Gender"
      form={form}
      placeholder="Select preferred gender"
      options={[
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
        { value: "any", label: "Any" },
      ]}
      isRequired={mode === "create"}
    />
    <FormField
      name="partnerPreferenceAgeMin"
      label="Min Preferred Partner Age"
      form={form}
      type="number"
      placeholder="e.g., 25"
    />
    <FormField
      name="partnerPreferenceAgeMax"
      label="Max Preferred Partner Age"
      form={form}
      type="number"
      placeholder="e.g., 35"
    />
    <FormField
      name="partnerPreferenceUkCity"
      label="Preferred Partner UK City/Cities"
      form={form}
      placeholder="e.g., London, Birmingham"
    />
  </>
);

export default ProfileFormStepAbout;
