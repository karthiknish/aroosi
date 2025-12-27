import React from "react";
import { Heart } from "lucide-react";
import { ProfileDetailView, DisplaySection } from "./ProfileViewComponents";
import type { Profile } from "@aroosi/shared/types";

interface PartnerPreferencesSectionProps {
  profileData: Profile;
}

export const PartnerPreferencesSection: React.FC<PartnerPreferencesSectionProps> = ({
  profileData,
}) => {
  return (
    <DisplaySection
      title={
        <span className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          Partner Preferences
        </span>
      }
    >
      <ProfileDetailView
        label="Age Range"
        value={
          profileData.partnerPreferenceAgeMin && profileData.partnerPreferenceAgeMax
            ? `${profileData.partnerPreferenceAgeMin} - ${profileData.partnerPreferenceAgeMax} years`
            : "-"
        }
      />
      <ProfileDetailView
        label="Preferred Religion"
        value={Array.isArray(profileData.partnerPreferenceReligion) ? profileData.partnerPreferenceReligion.join(", ") : profileData.partnerPreferenceReligion}
      />
      <ProfileDetailView
        label="Preferred Ethnicity"
        value={Array.isArray(profileData.partnerPreferenceEthnicity) ? profileData.partnerPreferenceEthnicity.join(", ") : profileData.partnerPreferenceEthnicity}
      />
      <ProfileDetailView
        label="Preferred Mother Tongue"
        value={Array.isArray(profileData.partnerPreferenceMotherTongue) ? profileData.partnerPreferenceMotherTongue.join(", ") : profileData.partnerPreferenceMotherTongue}
      />
      <ProfileDetailView
        label="Preferred City"
        value={Array.isArray(profileData.partnerPreferenceCity) ? profileData.partnerPreferenceCity.join(", ") : profileData.partnerPreferenceCity}
      />
      <ProfileDetailView
        label="Preferred Country"
        value={Array.isArray(profileData.partnerPreferenceCountry) ? profileData.partnerPreferenceCountry.join(", ") : profileData.partnerPreferenceCountry}
      />
      <ProfileDetailView
        label="Preferred Education"
        value={Array.isArray(profileData.partnerPreferenceEducation) ? profileData.partnerPreferenceEducation.join(", ") : profileData.partnerPreferenceEducation}
      />
      <ProfileDetailView
        label="Preferred Diet"
        value={Array.isArray(profileData.partnerPreferenceDiet) ? profileData.partnerPreferenceDiet.join(", ") : profileData.partnerPreferenceDiet}
      />
    </DisplaySection>
  );
};
