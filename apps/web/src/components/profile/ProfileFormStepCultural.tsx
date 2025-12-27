import React from "react";
import { ValidatedSelect } from "@/components/ui/ValidatedSelect";
import type { ProfileFormValues } from "@aroosi/shared/types";
import {
  RELIGIOUS_PRACTICES,
  FAMILY_VALUES,
  MARRIAGE_VIEWS,
  TRADITIONAL_VALUES,
} from "@aroosi/shared";

type Props = {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
};

const ProfileFormStepCultural: React.FC<Props> = ({ form }) => {
  // Helper to convert record to options array
  const toOptions = (record: Record<string, string>) =>
    Object.entries(record)
      .filter(([key]) => key !== "") // Filter out "Prefer not to say" empty key if needed, or keep it
      .map(([value, label]) => ({ value, label }));

  const { watch, setValue } = form;

  return (
    <>
      <ValidatedSelect
        label="Religious Practice"
        field="religiousPractice"
        step={3 as any} // Align with cultural step number
        value={(watch("religiousPractice") as string) ?? ""}
        onValueChange={(v) =>
          setValue("religiousPractice", v as any, { shouldDirty: true })
        }
        options={toOptions(RELIGIOUS_PRACTICES)}
        placeholder="Select practice level"
      />

      <ValidatedSelect
        label="Family Values"
        field="familyValues"
        step={3 as any}
        value={(watch("familyValues") as string) ?? ""}
        onValueChange={(v) =>
          setValue("familyValues", v as any, { shouldDirty: true })
        }
        options={toOptions(FAMILY_VALUES)}
        placeholder="Select family values"
      />

      <ValidatedSelect
        label="Marriage Views"
        field="marriageViews"
        step={3 as any}
        value={(watch("marriageViews") as string) ?? ""}
        onValueChange={(v) =>
          setValue("marriageViews", v as any, { shouldDirty: true })
        }
        options={toOptions(MARRIAGE_VIEWS)}
        placeholder="Select marriage views"
      />

      <ValidatedSelect
        label="Traditional Values"
        field="traditionalValues"
        step={3 as any}
        value={(watch("traditionalValues") as string) ?? ""}
        onValueChange={(v) =>
          setValue("traditionalValues", v as any, { shouldDirty: true })
        }
        options={toOptions(TRADITIONAL_VALUES)}
        placeholder="Select importance"
      />
    </>
  );
};

export default ProfileFormStepCultural;
