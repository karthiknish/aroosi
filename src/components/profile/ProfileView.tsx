"use client";

import React, { useState } from "react";
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
import { ProfileImageReorder } from "@/components/ProfileImageReorder";
import { planDisplayName } from "@/lib/utils/plan";
import { isPremium, isPremiumPlus } from "@/lib/utils/subscriptionPlan";
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteProfile } from "@/lib/utils/profileApi";
import { useAuthContext } from "@/components/ClerkAuthProvider";
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
  const textClass = isSubtle
    ? "text-sm text-gray-500"
    : "text-md text-gray-800";

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

/**
 * Section component for grouping related profile information
 */
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
    <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
  // Cookie-auth: token is no longer exposed in AuthContext
  useAuthContext();

  // Small mapping utility for plan labels using centralized helper
  const planLabel = (id?: string | null) => planDisplayName(id);

  // Format annual income (GBP by default)
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
    } catch (e) {
      // Fallback to subscription page if portal not available
      router.push("/subscription");
    }
  };

  // Format images for the image reorder component
  const imageList = React.useMemo(() => {
    if (Array.isArray(images)) {
      const formattedImages = images.map(
        (
          img: string | { _id: string; url?: string; storageId?: string },
          index: number
        ) => {
          const imageId =
            typeof img === "string" ? img : img._id || `img-${index}`;
          let imageUrl =
            typeof img === "string"
              ? `/api/profile/image/${img}`
              : img.url || `/api/profile/image/${imageId}`;

          // Ensure URL is absolute if it's not already
          if (
            imageUrl &&
            !imageUrl.startsWith("http") &&
            !imageUrl.startsWith("blob:") &&
            !imageUrl.startsWith("data:")
          ) {
            imageUrl = new URL(imageUrl, window.location.origin).toString();
          }

          return {
            id: imageId,
            _id: imageId,
            url: imageUrl,
            storageId:
              typeof img === "string" ? img : img.storageId || img._id || "",
          };
        }
      );
      return formattedImages;
    }

    if (
      Array.isArray(profileData?.profileImageIds) &&
      profileData.profileImageIds.length > 0
    ) {
      return profileData.profileImageIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => ({
          id,
          _id: id,
          url: `/api/profile/image/${id}`,
          storageId: id,
        }));
    }

    return [];
  }, [images, profileData?.profileImageIds]);

  // Delete profile handler
  const handleDeleteProfile = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      // Cookie-auth: server reads session from cookies
      await deleteProfile();
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else if (typeof err === "string") {
        setDeleteError(err);
      } else {
        setDeleteError("An error occurred while deleting your profile.");
      }
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  // Utility to refresh localStorage values (customize keys as needed)
  function refreshProfileLocalStorage() {
    // Only update 'onboarding' key, do not save 'profile' or any _id/userId
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
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <Card className="bg-white/90 rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-3xl font-serif mb-4 text-neutral sm:text-4xl font-semibold tracking-tight ">
                My Profile
              </CardTitle>
              <CardDescription className="text-gray-600">
                View and manage your information.
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isPremiumPlus(profileData.subscriptionPlan) ? (
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
                      // Lazy import cookie-auth variant to avoid adding to initial bundle
                      const { boostProfileCookieAuth } = await import(
                        "@/lib/utils/profileApi"
                      );
                      const result = await boostProfileCookieAuth();
                      // Use established toast utility if available; otherwise log
                      try {
                        const { showSuccessToast } = await import(
                          "@/lib/ui/toast"
                        );
                        showSuccessToast(
                          `Profile boosted for 24 hours! (${result.boostsRemaining ?? 0} boosts left this month)`
                        );
                      } catch {
                        console.info("Profile boosted for 24 hours.", {
                          remaining: result.boostsRemaining,
                        });
                      }
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
                className="border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
              >
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button
                onClick={() => router.push("/profile/edit/images")}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Camera className="mr-2 h-4 w-4" /> Edit Photos
              </Button>
              <Button
                onClick={() => router.push("/usage")}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <BarChart className="mr-2 h-4 w-4" /> Usage
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                disabled={deleteLoading}
              >
                Delete Profile
              </Button>
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
                      {isPremium(profileData.subscriptionPlan) && (
                        <BadgeCheck className="w-4 h-4 text-[#BFA67A]" />
                      )}
                      {isPremium(profileData.subscriptionPlan) &&
                        profileData.hasSpotlightBadge &&
                        profileData.spotlightBadgeExpiresAt &&
                        profileData.spotlightBadgeExpiresAt > Date.now() && (
                          <SpotlightIcon className="w-4 h-4" />
                        )}
                      {!isPremiumPlus(profileData.subscriptionPlan) && (
                        <button
                          type="button"
                          className="ml-2 text-[11px] text-amber-700 underline"
                          onClick={() =>
                            (window.location.href = "/subscription")
                          }
                          title="Upgrade to Premium Plus for a spotlight badge"
                        >
                          Get Spotlight
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
                    value={profileData.partnerPreferenceAgeMin?.toString()}
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
                      {planDisplayName(profileData.subscriptionPlan)}
                    </span>

                    {/* Action buttons based on plan */}
                    {!isPremium(profileData.subscriptionPlan) && (
                      <Button
                        size="sm"
                        className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                        onClick={() => router.push("/plans")}
                      >
                        Upgrade
                      </Button>
                    )}

                    {isPremium(profileData.subscriptionPlan) &&
                      !isPremiumPlus(profileData.subscriptionPlan) && (
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

                    {isPremiumPlus(profileData.subscriptionPlan) && (
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
                  {!isPremiumPlus(profileData.subscriptionPlan) && (
                    <div className="mt-2 text-xs text-amber-700">
                      Want a spotlight badge?{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => (window.location.href = "/subscription")}
                        title="Upgrade to Premium Plus to get Spotlight"
                      >
                        Get Spotlight
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
