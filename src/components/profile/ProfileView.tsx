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
} from "lucide-react";
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
import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
    <div className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${className}`}>
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
    className={`space-y-1 pt-6 pb-8 ${!noBorder ? "border-b border-gray-100" : ""} ${
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
}) => {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

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
  console.log(profileData);
  // Delete profile handler
  const handleDeleteProfile = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete profile.");
      }
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
    // Only update 'onboarding' key, do not save 'profile' or any _id/clerkId/userId
    if (profileData && profileData.isOnboardingComplete !== undefined) {
      localStorage.setItem(
        "onboarding",
        profileData.isOnboardingComplete ? "complete" : "incomplete"
      );
    }
  }

  return (
    <div
      className={`w-full pt-12 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden ${className}`}
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
            <div className="flex gap-2">
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
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        No profile images uploaded yet.
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
                  <ProfileDetailView
                    label="Full Name"
                    value={profileData.fullName}
                  />
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
                      Location (UK) & Lifestyle
                    </span>
                  }
                >
                  <ProfileDetailView label="City" value={profileData.ukCity} />
                  <ProfileDetailView
                    label="Postcode"
                    value={profileData.ukPostcode}
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
                      <Heart className="h-5 w-5 text-accent" />
                      Cultural & Religious Background
                    </span>
                  }
                >
                  <ProfileDetailView
                    label="Religion"
                    value={profileData.religion}
                  />
                  <ProfileDetailView
                    label="Sect/Caste"
                    value={profileData.caste}
                  />
                  <ProfileDetailView
                    label="Mother Tongue"
                    value={profileData.motherTongue}
                  />
                  <ProfileDetailView
                    label="Marital Status"
                    value={profileData.maritalStatus}
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
                    value={profileData.annualIncome}
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
                    label="Preferred Partner Religion(s)"
                    value={
                      Array.isArray(profileData.partnerPreferenceReligion) &&
                      profileData.partnerPreferenceReligion.length > 0
                        ? profileData.partnerPreferenceReligion.join(", ")
                        : "-"
                    }
                  />
                  <ProfileDetailView
                    label="Preferred Partner UK City/Cities"
                    value={
                      Array.isArray(profileData.partnerPreferenceUkCity) &&
                      profileData.partnerPreferenceUkCity.length > 0
                        ? profileData.partnerPreferenceUkCity.join(", ")
                        : "-"
                    }
                  />
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
