import React from "react";
import { FormField, FormSelectField } from "./ProfileFormFields";
import type { ProfileFormValues } from "./ProfileForm";

type Props = {
  form: import("react-hook-form").UseFormReturn<ProfileFormValues>;
};

const ProfileFormStepCultural: React.FC<Props> = ({ form }) => (
  <>
    <FormSelectField
      name="religion"
      label="Religion"
      form={form}
      placeholder="Select religion"
      options={[
        { value: "islam", label: "Islam" },
        { value: "christianity", label: "Christianity" },
        { value: "hinduism", label: "Hinduism" },
        { value: "sikhism", label: "Sikhism" },
        { value: "judaism", label: "Judaism" },
        { value: "other", label: "Other" },
      ]}
      isRequired
    />
    <FormField
      name="caste"
      label="Sect (e.g., Sunni, Shia)"
      form={form}
      placeholder="Optional"
    />
    <FormField
      name="motherTongue"
      label="Mother Tongue"
      form={form}
      placeholder="e.g., Dari, Pashto, Uzbek"
    />
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
