"use client";

import React from "react";
import {
  Calendar,
  Ruler,
  Users,
  DollarSign,
  BookOpen,
  Briefcase,
  MapPin,
  Utensils,
  Cigarette,
  Wine,
  Accessibility,
  Building2,
  Heart as HeartIcon,
  Scale,
} from "lucide-react";
import {
  calculateAge,
  formatHeight,
  formatCurrency,
  formatBoolean,
  formatArrayToString,
} from "@/lib/utils/profileFormatting";
import {
  RELIGIOUS_PRACTICES,
  FAMILY_VALUES,
  MARRIAGE_VIEWS,
  TRADITIONAL_VALUES,
} from "@aroosi/shared";
import type { Profile } from "@aroosi/shared/types";

interface IconRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}

function IconRow({ icon, label, value }: IconRowProps) {
  return (
    <div className="flex items-center gap-3 text-neutral-dark">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-neutral-light font-medium uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm md:text-base font-medium text-neutral-dark">
          {value ?? "-"}
        </span>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif font-semibold mb-4 flex items-center gap-2 text-neutral-dark text-xl border-b border-neutral/10 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

export function ProfileInfoSections({ profile }: { profile: Profile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 px-6 md:px-10 py-8">
      {/* Basic Information */}
      <Section title="Basic Information">
        <IconRow
          icon={<Calendar className="w-4 h-4" />}
          label="Age"
          value={calculateAge(profile.dateOfBirth || "")?.toString() || "-"}
        />
        <IconRow
          icon={<Ruler className="w-4 h-4" />}
          label="Height"
          value={formatHeight(profile.height || "")}
        />
        <IconRow
          icon={<Users className="w-4 h-4" />}
          label="Marital Status"
          value={formatBoolean(profile.maritalStatus || "")}
        />
        <IconRow
          icon={<DollarSign className="w-4 h-4" />}
          label="Annual Income"
          value={formatCurrency(profile.annualIncome || "")}
        />
      </Section>

      {/* Education & Career */}
      <Section title="Education & Career">
        <IconRow
          icon={<BookOpen className="w-4 h-4" />}
          label="Education"
          value={profile.education ?? "-"}
        />
        <IconRow
          icon={<Briefcase className="w-4 h-4" />}
          label="Occupation"
          value={profile.occupation ?? "-"}
        />
      </Section>

      {/* Location */}
      <Section title="Location">
        <IconRow
          icon={<MapPin className="w-4 h-4" />}
          label="City"
          value={profile.city ?? "-"}
        />
        <IconRow
          icon={<MapPin className="w-4 h-4" />}
          label="Country"
          value={profile.country ?? "-"}
        />
      </Section>

      {/* Lifestyle */}
      <Section title="Lifestyle">
        <IconRow
          icon={<Utensils className="w-4 h-4" />}
          label="Diet"
          value={formatBoolean(profile.diet || "")}
        />
        <IconRow
          icon={<Cigarette className="w-4 h-4" />}
          label="Smoking"
          value={formatBoolean(profile.smoking || "")}
        />
        <IconRow
          icon={<Wine className="w-4 h-4" />}
          label="Drinking"
          value={formatBoolean(profile.drinking || "")}
        />
        <IconRow
          icon={<Accessibility className="w-4 h-4" />}
          label="Physical Status"
          value={formatBoolean(profile.physicalStatus || "")}
        />
      </Section>

      {/* Religious Information */}
      <Section title="Religious Information">
        <IconRow
          icon={<Building2 className="w-4 h-4" />}
          label="Religion"
          value={formatBoolean(profile.religion || "")}
        />
        <IconRow
          icon={<Users className="w-4 h-4" />}
          label="Mother Tongue"
          value={formatBoolean(profile.motherTongue || "")}
        />
        <IconRow
          icon={<Users className="w-4 h-4" />}
          label="Ethnicity"
          value={formatBoolean(profile.ethnicity || "")}
        />
      </Section>

      {/* Cultural Values */}
      <Section title="Cultural Values">
        <IconRow
          icon={<Building2 className="w-4 h-4" />}
          label="Religious Practice"
          value={
            profile.religiousPractice
              ? RELIGIOUS_PRACTICES[profile.religiousPractice]
              : "-"
          }
        />
        <IconRow
          icon={<Users className="w-4 h-4" />}
          label="Family Values"
          value={profile.familyValues ? FAMILY_VALUES[profile.familyValues] : "-"}
        />
        <IconRow
          icon={<HeartIcon className="w-4 h-4" />}
          label="Marriage Views"
          value={profile.marriageViews ? MARRIAGE_VIEWS[profile.marriageViews] : "-"}
        />
        <IconRow
          icon={<Scale className="w-4 h-4" />}
          label="Traditional Values"
          value={
            profile.traditionalValues
              ? TRADITIONAL_VALUES[profile.traditionalValues]
              : "-"
          }
        />
      </Section>

      {/* Partner Preferences */}
      <Section title="Partner Preferences">
        <IconRow
          icon={<Calendar className="w-4 h-4" />}
          label="Age Range"
          value={
            profile.partnerPreferenceAgeMin && profile.partnerPreferenceAgeMax
              ? `${profile.partnerPreferenceAgeMin} - ${profile.partnerPreferenceAgeMax}`
              : "-"
          }
        />
        <IconRow
          icon={<MapPin className="w-4 h-4" />}
          label="Preferred Location"
          value={formatArrayToString(profile.partnerPreferenceCity)}
        />
        <IconRow
          icon={<Users className="w-4 h-4" />}
          label="Preferred Gender"
          value={formatBoolean(profile.preferredGender || "")}
        />
      </Section>
    </div>
  );
}
