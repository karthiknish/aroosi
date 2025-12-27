import React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Mail,
  Phone,
  UserCircle,
  GraduationCap,
  Briefcase,
  Info,
  BadgeCheck,
} from "lucide-react";
import { BadgeCheck as BadgeCheckIcon } from "lucide-react";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { ProfileDetailView, DisplaySection } from "./ProfileViewComponents";
import { PremiumFeatureGuard } from "@/components/subscription/PremiumFeatureGuard";
import { isPremium, isPremiumPlus } from "@/lib/utils/subscriptionPlan";
import { activateSpotlight } from "@/lib/profile/userProfileApi";
import type { Profile } from "@aroosi/shared/types";

interface ProfileInfoSectionsProps {
  profileData: Profile;
  userConvexData?: { _id?: string; _creationTime?: number } | null;
  plan: any;
  activeSpotlight: boolean;
}

export const ProfileInfoSections: React.FC<ProfileInfoSectionsProps> = ({
  profileData,
  userConvexData,
  plan,
  activeSpotlight,
}) => {
  const router = useRouter();

  const formatCurrency = (v?: string | number) => {
    if (v === undefined || v === null || v === "") return "-";
    const n =
      typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n)) return String(v);
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return String(v);
    }
  };

  return (
    <>
      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-accent" />
            Basic Information
          </span>
        }
      >
        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-6 border-b border-neutral/10">
          <dt className="text-sm font-medium text-neutral-light flex items-center gap-2">
            Full Name
          </dt>
          <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-neutral-dark flex items-center gap-1">
            {profileData.fullName}
            {isPremium(plan) && (
              <BadgeCheckIcon className="w-4 h-4 text-accent" />
            )}
            {isPremium(plan) && activeSpotlight && (
              <SpotlightIcon className="w-4 h-4" />
            )}
            <PremiumFeatureGuard
              feature="spotlight_badge"
              requiredTier="premiumPlus"
              showUpgradePrompt={false}
            >
              <></>
            </PremiumFeatureGuard>
            {!activeSpotlight && isPremiumPlus(plan) && (
              <button
                type="button"
                className="ml-2 text-[11px] text-accent-dark underline"
                onClick={async () => {
                  try {
                    const { showSuccessToast, showErrorToast } =
                      await import("@/lib/ui/toast");
                    const res = await activateSpotlight();
                    if (res.success) {
                      showSuccessToast(
                        "Spotlight activated – you’re highlighted for 30 days"
                      );
                      router.refresh?.();
                    } else {
                      showErrorToast(
                        res.message,
                        "Activation failed"
                      );
                    }
                  } catch (e) {
                    console.warn("activate spotlight failed", e);
                  }
                }}
                title="Activate Spotlight to increase profile visibility"
              >
                Activate Spotlight (30 days)
              </button>
            )}
            {!isPremiumPlus(plan) && (
              <button
                type="button"
                className="ml-2 text-[11px] text-accent-dark underline"
                onClick={() =>
                  (window.location.href = "/subscription")
                }
                title="Upgrade to Premium Plus to unlock Spotlight and boosts"
              >
                Get Spotlight (stand out more)
              </button>
            )}
          </dd>
        </div>
        <ProfileDetailView
          label="Date of Birth"
          value={
            profileData.dateOfBirth
              ? new Date(profileData.dateOfBirth).toLocaleDateString(
                  "en-GB"
                )
              : "-"
          }
          icon={<Calendar className="h-4 w-4" />}
        />
        <ProfileDetailView
          label="Gender"
          value={profileData.gender}
        />
        <ProfileDetailView
          label="Height"
          value={profileData.height}
        />
        <ProfileDetailView
          label="Phone Number"
          value={profileData.phoneNumber}
          icon={<Phone className="h-4 w-4" />}
        />
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            Account Information
          </span>
        }
      >
        <ProfileDetailView
          label="Email"
          value={profileData.email}
          icon={<Mail className="h-4 w-4" />}
        />
        <ProfileDetailView
          label="Joined Aroosi"
          value={
            userConvexData?._creationTime
              ? new Date(
                  userConvexData._creationTime
                ).toLocaleDateString()
              : "-"
          }
          icon={<Calendar className="h-4 w-4" />}
        />
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Location & Lifestyle
          </span>
        }
      >
        <ProfileDetailView label="City" value={profileData.city} />
        <ProfileDetailView
          label="Country"
          value={profileData.country}
        />
        <ProfileDetailView label="Diet" value={profileData.diet} />
        <ProfileDetailView
          label="Smoking"
          value={profileData.smoking}
        />
        <ProfileDetailView
          label="Drinking"
          value={profileData.drinking}
        />
        <ProfileDetailView
          label="Physical Status"
          value={profileData.physicalStatus}
        />
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-accent" />
            Cultural Background
          </span>
        }
      >
        <ProfileDetailView
          label="Mother Tongue"
          value={profileData.motherTongue}
        />
        <ProfileDetailView
          label="Religion"
          value={profileData.religion}
        />
        <ProfileDetailView
          label="Ethnicity"
          value={profileData.ethnicity}
        />
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Education & Career
          </span>
        }
      >
        <ProfileDetailView
          label="Education"
          value={profileData.education}
        />
        <ProfileDetailView
          label="Occupation"
          value={profileData.occupation}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <ProfileDetailView
          label="Annual Income"
          value={formatCurrency(profileData.annualIncome)}
        />
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent" />
            About Me
          </span>
        }
      >
        <ProfileDetailView
          label="Bio"
          value={profileData.aboutMe}
          isTextArea
        />
      </DisplaySection>
    </>
  );
};
