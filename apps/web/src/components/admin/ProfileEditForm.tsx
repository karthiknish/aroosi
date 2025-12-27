"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { ProfileFormValues, ProfileImageInfo, Profile } from "@aroosi/shared/types";
import { useProfileEditFormLogic } from "@/hooks/useProfileEditFormLogic";
import { COUNTRIES } from "@/lib/constants/countries";

// Sub-components
import { ProfileFormHeader } from "./profile-edit/ProfileFormHeader";
import { ImageManagementSection } from "./profile-edit/ImageManagementSection";
import { BasicInfoFields } from "./profile-edit/BasicInfoFields";
import { ProfessionalLifestyleFields } from "./profile-edit/ProfessionalLifestyleFields";
import { CulturalReligiousFields } from "./profile-edit/CulturalReligiousFields";
import { PartnerPreferenceFields } from "./profile-edit/PartnerPreferenceFields";
import { SubscriptionAdminFields } from "./profile-edit/SubscriptionAdminFields";
import { ManualMatchSection } from "./profile-edit/ManualMatchSection";

type Props = {
  initialValues: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  onCancel?: () => void;
  profileId?: string;
  token?: string;
  images: ProfileImageInfo[];
  setImages: React.Dispatch<React.SetStateAction<ProfileImageInfo[]>>;
  imagesLoading: boolean;
  matches?: Profile[];
};

export default function ProfileEditForm({
  initialValues,
  onSubmit,
  loading = false,
  serverError,
  onCancel,
  profileId,
  images,
  setImages,
  imagesLoading,
  matches = [],
}: Props) {
  const {
    form,
    handleFormSubmit,
    imagesState,
    matchState,
  } = useProfileEditFormLogic({
    initialValues,
    onSubmit,
    profileId,
    images,
    setImages,
  });

  const countries = useMemo(() => COUNTRIES.map((c) => c.name).sort(), []);

  return (
    <form
      className="space-y-10 bg-base-light p-6 sm:p-10 rounded-2xl shadow-sm border border-neutral/10"
      onSubmit={handleFormSubmit}
      autoComplete="off"
    >
      <ProfileFormHeader onCancel={onCancel} loading={loading} />

      {/* Profile Images Section */}
      <ImageManagementSection
        profileId={profileId}
        images={images}
        imagesLoading={imagesLoading}
        uploading={imagesState.uploading}
        imageError={imagesState.imageError}
        handleImageUpload={imagesState.handleImageUpload}
        handleDeleteImage={imagesState.handleDeleteImage}
        handleReorderImages={imagesState.handleReorderImages}
      />

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium">
          {serverError}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-12">
        <BasicInfoFields
          register={form.register}
          errors={form.formState.errors}
          control={form.control}
          countries={countries}
        />

        <ProfessionalLifestyleFields register={form.register} />

        <CulturalReligiousFields register={form.register} />

        <PartnerPreferenceFields register={form.register} />

        <SubscriptionAdminFields
          register={form.register}
          control={form.control}
        />

        <ManualMatchSection
          profileId={profileId}
          manualMatchName={matchState.manualMatchName}
          setManualMatchName={matchState.setManualMatchName}
          creatingMatch={matchState.creatingMatch}
          matchError={matchState.matchError}
          suggestions={matchState.suggestions}
          selectedProfile={matchState.selectedProfile}
          setSelectedProfile={matchState.setSelectedProfile}
          handleCreateMatch={matchState.handleCreateMatch}
          matches={matches}
        />
      </div>

      {/* Persistent Footer Actions */}
      <div className="flex items-center justify-end gap-4 pt-8 border-t border-neutral/10">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="px-8 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 px-8 text-white"
          disabled={loading}
        >
          {loading && <LoadingSpinner size={16} className="mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
