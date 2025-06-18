import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { cmToFeetInches } from "@/lib/utils/height";
import ProfileFormStepBasicInfo from "./ProfileFormStepBasicInfo";
import ProfileFormStepLocation from "./ProfileFormStepLocation";
import ProfileFormStepCultural from "./ProfileFormStepCultural";
import ProfileFormStepEducation from "./ProfileFormStepEducation";
import ProfileFormStepAbout from "./ProfileFormStepAbout";
import { Button } from "@/components/ui/button";
import type { ProfileFormValues } from "@/types/profile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type Props = {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  loading?: boolean;
  serverError?: string | null;
  // profileId: string;
  // no image props
};

const FormSection: React.FC<{
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}> = ({ title, children, gridClassName }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg md:text-xl font-semibold">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent
      className={
        gridClassName || "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
      }
    >
      {children}
    </CardContent>
  </Card>
);

export default function ProfileEditSimpleForm({
  initialValues,
  onSubmit,
  loading = false,
  serverError,

  // profileId: _profileId,
  // no image props
}: Props) {
  const form = useForm<Partial<ProfileFormValues>>({
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const { handleSubmit, formState } = form;

  // Reset form when initialValues prop changes
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length) {
      form.reset(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialValues)]);

  const isDataReady =
    initialValues &&
    Object.values(initialValues).some((v) =>
      Array.isArray(v)
        ? v.length > 0
        : typeof v === "object"
          ? !!v
          : String(v || "").trim() !== ""
    );

  if (!isDataReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="mt-2 text-pink-700 font-medium">
          Loading profile...
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => {
        onSubmit(data as ProfileFormValues);
      })}
      className="space-y-8 w-full max-w-4xl mx-auto pb-24"
    >
      <FormSection title="Basic Information">
        <ProfileFormStepBasicInfo form={form} cmToFeetInches={cmToFeetInches} />
      </FormSection>
      <FormSection title="Location (UK) & Lifestyle">
        <ProfileFormStepLocation form={form} ukCityOptions={[]} />
      </FormSection>
      <FormSection title="Cultural Background">
        <ProfileFormStepCultural form={form} />
      </FormSection>
      <FormSection title="Education & Career">
        <ProfileFormStepEducation form={form} />
      </FormSection>
      <FormSection title="About & Preferences">
        <ProfileFormStepAbout form={form} mode="edit" />
      </FormSection>
      {/* Profile photos editing handled in separate page */}

      {serverError && (
        <p className="text-sm font-medium text-destructive mt-4">
          {serverError}
        </p>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 py-3 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            type="submit"
            loading={loading}
            disabled={loading || !formState.isDirty}
            className="min-w-[140px]"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
