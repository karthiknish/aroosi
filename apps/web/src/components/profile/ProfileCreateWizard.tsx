"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProfileFormValues } from "@aroosi/shared/types";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import ProfileFormStepBasicInfo from "./ProfileFormStepBasicInfo";
import ProfileFormStepLocation from "./ProfileFormStepLocation";
import ProfileFormStepCultural from "./ProfileFormStepCultural";
import ProfileFormStepEducation from "./ProfileFormStepEducation";
import ProfileFormStepAbout from "./ProfileFormStepAbout";
import ProfileFormStepImages from "./ProfileFormStepImages";
import { cmToFeetInches } from "@/lib/validation/heightValidation";

interface Props {
  initialValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  profileId?: string;
}

const steps = [
  "Basic Info",
  "Location & Lifestyle",
  "Cultural",
  "Education & Career",
  "About",
  "Photos",
];

export default function ProfileCreateWizard({
  initialValues = {},
  onSubmit,
  loading = false,
  serverError,
  profileId = "",
}: Props) {
  const [step, setStep] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<ProfileImageInfo[]>([]);

  const rawForm = useForm<Partial<ProfileFormValues>>({
    mode: "onBlur",
    defaultValues: {
      profileFor: "self",
      preferredGender: "any",
      ...initialValues,
    } as Partial<ProfileFormValues>,
  });

  const form = rawForm;

  const handleNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleImagesChanged = useCallback(
    (images: ProfileImageInfo[] | string[]) => {
    if (typeof images[0] === "string") {
      // If string[], do nothing or handle as needed
      return;
    }
      setUploadedImages(images as ProfileImageInfo[]);
    },
    []
  );

  const handleImageDelete = useCallback(async (imageId: string) => {
    setUploadedImages((prev) =>
      prev.filter((img) => img.storageId !== imageId)
    );
  }, []);

  const handleImageReorder = useCallback((newOrder: ProfileImageInfo[]) => {
    setUploadedImages(newOrder);
  }, []);

  const submitCurrent = form.handleSubmit((data) => {
    if (step < steps.length - 1) {
      handleNext();
    } else {
      const finalData = {
        ...data,
        profileImageIds:
          uploadedImages.length > 0
            ? uploadedImages.map((img) => img.storageId)
            : undefined,
      } as ProfileFormValues;
      void onSubmit(finalData);
    }
  });

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <ProfileFormStepBasicInfo
            form={form}
            cmToFeetInches={cmToFeetInches}
          />
        );
      case 1:
        return (
          <ProfileFormStepLocation
            form={form}
            cityOptions={[]}
            countryOptions={[]}
          />
        );
      case 2:
        return <ProfileFormStepCultural form={form} />;
      case 3:
        return <ProfileFormStepEducation form={form} />;
      case 4:
        return <ProfileFormStepAbout form={form} mode="create" />;
      case 5:
        return (
          <ProfileFormStepImages
            images={uploadedImages}
            onImagesChanged={handleImagesChanged}
            onImageDelete={handleImageDelete}
            onImageReorder={handleImageReorder}
            isLoading={false}
            profileId={profileId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create Profile</CardTitle>
        <Progress
          value={((step + 1) / steps.length) * 100}
          className="h-2 mt-4"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={submitCurrent} className="space-y-6">
          {renderStep()}

          {serverError && (
            <p className="text-sm font-medium text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={loading}>
              {step === steps.length - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
