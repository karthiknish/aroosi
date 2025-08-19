"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Mail,
  Phone,
  Heart,
  Camera,
  UserCircle,
  GraduationCap,
  Briefcase,
  Info,
  Edit3,
  BadgeCheck,
  BarChart,
} from "lucide-react";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
// Stripe portal helper
import { openBillingPortal } from "@/lib/utils/stripeUtil";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Profile } from "@/types/profile";
// Lazy-load heavier image reorder component to reduce initial JS
import dynamic from "next/dynamic";
const ProfileImageReorder = dynamic(
  () =>
    import("@/components/ProfileImageReorder").then(
      (m) => m.ProfileImageReorder
    ),
  { ssr: false }
);
import { planDisplayName } from "@/lib/utils/plan";
import { isPremium, isPremiumPlus } from "@/lib/utils/subscriptionPlan";
import { normalisePlan } from "@/lib/subscription/planLimits";
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteProfile } from "@/lib/utils/profileApi";
import { boostProfile, activateSpotlight } from "@/lib/profile/userProfileApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { PremiumFeatureGuard } from "@/components/subscription/PremiumFeatureGuard";
import { normalizeProfileImages } from "@/lib/images/profileImageUtils";
// Re-export types for backward compatibility
type ApiImage = unknown;
type MappedImage = unknown;

export type { ApiImage, MappedImage };

// Types for components
interface ProfileDetailViewProps {
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
  isSubtle?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

interface DisplaySectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  noBorder?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Reusable component for displaying profile details in a consistent format
 */
const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  label,
  value,
  isTextArea = false,
  isSubtle = false,
  icon,
  className = "",
}) => {
  const displayValue = value == null || value === "" ? "-" : String(value);
  const textClass = isSubtle ? "text-sm text-gray-500" : "text-md text-neutral";

  return (
    <div
      className={`py-3 sm:grid sm:grid-cols-3 sm:gap-6 border-b border-gray-100 last:border-b-0 ${className}`}
    >
      <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1 sm:mt-0 sm:col-span-2 ${
          isTextArea ? "whitespace-pre-wrap" : ""
        } ${textClass}`}
      >
        {displayValue}
      </dd>
    </div>
  );
};

// Section component
const DisplaySection: React.FC<DisplaySectionProps> = ({
  title,
  children,
  noBorder = false,
  fullWidth = false,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`space-y-6 pt-10 pb-12 ${!noBorder ? "border-b border-gray-100" : ""} ${
      fullWidth ? "w-full" : ""
    } first:border-t-0 first:pt-0 ${className}`}
  >
    <h2 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
      {title}
    </h2>
    {children}
  </motion.div>
);

export interface ProfileViewProps {
  profileData: Profile;
  userConvexData?: { _id?: string; _creationTime?: number } | null;
  imageOrder?: string[];
  setImageOrder?: (order: string[]) => void;
  isLoadingImages?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  images?: Array<string | { _id: string; url?: string; storageId?: string }>;
  className?: string;
}

const ProfileView: FC<ProfileViewProps> = ({
  profileData,
  images,
  userConvexData = null,
  className = "",
  isLoadingImages,
}) => {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const { user: authUser, profile: authProfile } = useAuthContext();
  const currentUserId =
    authUser?.uid ||
    (authProfile as any)?._id ||
    (authProfile as any)?.userId ||
    "";

  const plan = normalisePlan(profileData.subscriptionPlan as any);
  const activeSpotlight = Boolean(
    profileData.hasSpotlightBadge &&
      profileData.spotlightBadgeExpiresAt &&
      profileData.spotlightBadgeExpiresAt > Date.now()
  );

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

  const handleOpenBillingPortal = async () => {
    try {
      await openBillingPortal();
    } catch {
      router.push("/subscription");
    }
  };

  const imageList = useMemo(
    () =>
      normalizeProfileImages({
        rawImages: Array.isArray(images) ? (images as any[]) : undefined,
        profileImageUrls: (profileData as any)?.profileImageUrls,
        profileImageIds: profileData?.profileImageIds,
      }),
    [
      images,
      profileData?.profileImageIds,
      (profileData as any)?.profileImageUrls,
    ]
  );

  const handleDeleteProfile = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteProfile();
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) setDeleteError(err.message);
      else if (typeof err === "string") setDeleteError(err);
      else setDeleteError("An error occurred while deleting your profile.");
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  function refreshProfileLocalStorage() {
    if (profileData && profileData.isOnboardingComplete !== undefined) {
      localStorage.setItem(
        "onboarding",
        profileData.isOnboardingComplete ? "complete" : "incomplete"
      );
    }
  }

  return (
    <div
      className={`w-full overflow-y-hidden py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden ${className}`}
    >
      {/* Decorative color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <Card className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="border-b pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-2xl text-neutral font-semibold tracking-tight mb-1 flex items-center gap-2">
                My profile
                {isPremium(plan) && (
                  <BadgeCheck className="w-5 h-5 text-[#BFA67A]" />
                )}
              </p>
              <CardDescription className="text-neutral-light text-sm">
                View and manage your information
              </CardDescription>
            </div>
            <div className="w-full lg:w-auto flex flex-wrap items-stretch gap-2">
              {/* Primary actions cluster */}
              <div className="flex flex-1 lg:flex-none flex-wrap gap-2">
                {isPremiumPlus(plan) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-700 border-amber-400"
                    onClick={async () => {
                      try {
                        const boosted =
                          !!profileData.boostedUntil &&
                          (profileData.boostedUntil as number) > Date.now();
                        if (boosted) {
                          router.push("/premium-settings");
                          return;
                        }
                        const result = await boostProfile(currentUserId);
                        try {
                          const { showSuccessToast, showErrorToast } =
                            await import("@/lib/ui/toast");
                          if (result.success) {
                            showSuccessToast(
                              `Profile boosted for 24 hours! (${result.boostsRemaining ?? 0} boosts left this month)`
                            );
                          } else {
                            showErrorToast(result.message || "Boost failed");
                          }
                        } catch {}
                        // Refresh to reflect boosted state ribbon/badges
                        router.refresh?.();
                      } catch (e) {
                        try {
                          const { showErrorToast } = await import(
                            "@/lib/ui/toast"
                          );
                          showErrorToast(e as Error, "Boost failed");
                        } catch {
                          console.warn("Boost failed", e);
                        }
                        // Quota/rate-limits or any error -> send user to settings for context
                        router.push("/premium-settings");
                      }
                    }}
                    title="Profile Boost is available on Premium Plus."
                  >
                    Boost Profile
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-700 border-amber-400"
                    onClick={() => router.push("/subscription")}
                    title="Upgrade to Premium Plus to boost your profile"
                  >
                    Upgrade to Premium Plus to boost
                  </Button>
                )}
                <Button
                  onClick={() => {
                    refreshProfileLocalStorage();
                    router.push("/profile/edit");
                  }}
                  variant="outline"
                  size="sm"
                  className="border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700 flex items-center gap-1.5 rounded-full px-4"
                  title="Edit Profile Details"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
                <Button
                  onClick={() => router.push("/profile/edit/images")}
                  variant="outline"
                  size="sm"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-1.5 rounded-full px-4"
                  title="Manage Photos"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Photos</span>
                </Button>
                <Button
                  onClick={() => router.push("/usage")}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 flex items-center gap-1.5 rounded-full px-4"
                  title="Usage Analytics"
                >
                  <BarChart className="h-4 w-4" />
                  <span className="hidden sm:inline">Usage</span>
                </Button>
              </div>
              {/* Destructive / secondary cluster */}
              <div className="flex gap-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4"
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  disabled={deleteLoading}
                  title="Delete Profile"
                >
                  <span className="hidden sm:inline">Delete</span>
                  <span className="sm:hidden">Del</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {deleteError && (
              <div className="mb-4 text-red-600 text-sm">{deleteError}</div>
            )}
            {profileData ? (
              <>
                {/* Profile Images section */}
                <DisplaySection
                  title={
                    <span className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-accent" />
                      Profile Images
                    </span>
                  }
                  noBorder
                  fullWidth
                >
                  <div className="mt-2">
                    {imageList.length > 0 ? (
                      <ProfileImageReorder
                        images={imageList}
                        userId={profileData.userId}
                        renderAction={() => null}
                      />
                    ) : isLoadingImages ? (
                      <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <Skeleton
                            key={idx}
                            className="w-full aspect-square rounded-xl"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-white/60">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <Camera className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600">
                              You haven’t added any photos yet
                            </p>
                            <p className="text-xs text-gray-500">
                              Add 2–6 clear photos to get more matches
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                onClick={() =>
                                  router.push("/profile/edit/images")
                                }
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                                size="sm"
                              >
                                Add Photos
                              </Button>
                              <Button
                                onClick={() => router.push("/profile/edit")}
                                variant="outline"
                                size="sm"
                              >
                                Edit Profile
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DisplaySection>

                {/* Basic Information section follows */}
                <DisplaySection
                  title={
                    <span className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-accent" />
                      Basic Information
                    </span>
                  }
                >
                  {/* Full Name with spotlight tick for premium users */}
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-6 border-b border-gray-100">
                    <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      Full Name
                    </dt>
                    <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800 flex items-center gap-1">
                      {profileData.fullName}
                      {isPremium(plan) && (
                        <BadgeCheck className="w-4 h-4 text-[#BFA67A]" />
                      )}
                      {isPremium(plan) && activeSpotlight && (
                        <SpotlightIcon className="w-4 h-4" />
                      )}
                      <PremiumFeatureGuard
                        feature="spotlight_badge"
                        requiredTier="premiumPlus"
                        showUpgradePrompt={false}
                      >
                        {/* If user has Plus, show nothing extra here */}
                        <></>
                      </PremiumFeatureGuard>
                      {!activeSpotlight && isPremiumPlus(plan) && (
                        <button
                          type="button"
                          className="ml-2 text-[11px] text-amber-700 underline"
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
                                  res.message || "Activation failed"
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
                          className="ml-2 text-[11px] text-amber-700 underline"
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

                {/* Cultural Background - added for parity with onboarding/edit */}
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

                <DisplaySection
                  title={
                    <span className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-accent" />
                      Partner Preferences
                    </span>
                  }
                >
                  <ProfileDetailView
                    label="Min Preferred Partner Age"
                    value={
                      profileData.partnerPreferenceAgeMin === 0 ||
                      profileData.partnerPreferenceAgeMin === undefined ||
                      profileData.partnerPreferenceAgeMin === null
                        ? "18"
                        : profileData.partnerPreferenceAgeMin?.toString()
                    }
                  />
                  <ProfileDetailView
                    label="Max Preferred Partner Age"
                    value={profileData.partnerPreferenceAgeMax?.toString()}
                  />
                  <ProfileDetailView
                    label="Preferred Partner City/Cities"
                    value={
                      Array.isArray(profileData.partnerPreferenceCity) &&
                      profileData.partnerPreferenceCity.length > 0
                        ? profileData.partnerPreferenceCity.join(", ")
                        : "-"
                    }
                  />
                </DisplaySection>

                {/* Subscription Section */}
                <DisplaySection
                  title={
                    <span className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-600" /> Subscription
                    </span>
                  }
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-md font-semibold">
                      {planDisplayName(plan)}
                    </span>

                    {/* Action buttons based on plan */}
                    {!isPremium(plan) && (
                      <Button
                        size="sm"
                        className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                        onClick={() => router.push("/plans")}
                      >
                        Upgrade
                      </Button>
                    )}

                    {isPremium(plan) && !isPremiumPlus(plan) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-pink-600 border-pink-600"
                          onClick={() => router.push("/plans")}
                        >
                          Upgrade to Plus
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenBillingPortal}
                          title="Open Stripe Billing Portal"
                        >
                          Manage
                        </Button>
                      </div>
                    )}

                    {isPremiumPlus(plan) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenBillingPortal}
                        title="Open Stripe Billing Portal"
                      >
                        Manage Subscription
                      </Button>
                    )}
                  </div>

                  {/* Spotlight upsell hint for non-Plus plans */}
                  {!isPremiumPlus(plan) && (
                    <div className="mt-2 text-xs text-amber-700">
                      Boost visibility & attract more matches with Spotlight.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => (window.location.href = "/subscription")}
                        title="Upgrade to Premium Plus for Spotlight and unlimited boosts"
                      >
                        Upgrade to unlock
                      </button>
                    </div>
                  )}
                </DisplaySection>
              </>
            ) : (
              <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex flex-row items-center gap-4">
                  <Skeleton className="h-10 w-40 rounded" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
                {/* Profile image skeleton */}
                <div className="flex flex-row gap-4 items-center">
                  <Skeleton className="h-32 w-32 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-1/2 rounded" />
                    <Skeleton className="h-4 w-1/3 rounded" />
                  </div>
                </div>
                {/* Info blocks skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            Are you sure you want to delete your profile? This action cannot be
            undone.
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileView;
export { ProfileView };
