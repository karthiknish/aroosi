import React from "react";
import { FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "./ProfileForm";

type Props = {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
};

const ProfileFormStepCultural: React.FC<Props> = ({ form }) => (
  <>
    <FormSelectField
      name="maritalStatus"
      label="Marital Status"
      form={form}
      placeholder="Select status"
      options={[
        { value: "single", label: "Single" },
        { value: "divorced", label: "Divorced" },
        { value: "widowed", label: "Widowed" },
        { value: "annulled", label: "Annulled" },
      ]}
    />
  </>
);

export default ProfileFormStepCultural;
