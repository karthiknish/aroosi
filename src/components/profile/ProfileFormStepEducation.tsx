import React from "react";
import { FormField } from "./ProfileFormFields";
import type { ProfileFormValues } from "./ProfileForm";

type Props = {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
};

const ProfileFormStepEducation: React.FC<Props> = ({ form }) => (
  <>
    <FormField
      name="education"
      label="Education"
      form={form}
      placeholder="e.g., BSc Computer Science"
    />
    <FormField
      name="occupation"
      label="Occupation"
      form={form}
      placeholder="e.g., Software Engineer"
    />
    <FormField
      name="annualIncome"
      label="Annual Income (£)"
      form={form}
      type="number"
      placeholder="e.g., 40000"
      isRequired
    />
  </>
);

export default ProfileFormStepEducation;
