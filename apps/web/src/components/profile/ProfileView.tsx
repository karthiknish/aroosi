import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Profile, ProfileImageInfo } from "@aroosi/shared/types";
import { normalisePlan } from "@/lib/subscription/planLimits";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { normalizeProfileImages } from "@/lib/images/profileImageUtils";
import { profileAPI } from "@/lib/api/profile";

// Extracted components
import { ProfileHeader } from "./view/ProfileHeader";
import { ProfileImagesSection } from "./view/ProfileImagesSection";
import { ProfileInfoSections } from "./view/ProfileInfoSections";
import { PartnerPreferencesSection } from "./view/PartnerPreferencesSection";
import { SubscriptionAndDangerSection } from "./view/SubscriptionAndDangerSection";

export interface ProfileViewProps {
  profileData: Profile;
  userConvexData?: { _id?: string; _creationTime?: number } | null;
  imageOrder?: string[];
  setImageOrder?: (order: string[]) => void;
  isLoadingImages?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  images?: ProfileImageInfo[];
  className?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({
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

  const profileImageUrls = (profileData as any)?.profileImageUrls;
  const profileImageIds = profileData?.profileImageIds;
  const imageList = useMemo(() => {
    return normalizeProfileImages({
      rawImages: Array.isArray(images) ? (images as any[]) : undefined,
      profileImageUrls,
      profileImageIds,
    });
  }, [images, profileImageUrls, profileImageIds]);

  const handleDeleteProfile = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await profileAPI.deleteProfile();
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

  return (
    <div
      className={`w-full overflow-y-hidden py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden ${className}`}
    >
      {/* Decorative color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent rounded-full blur-3xl opacity-10 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='hsl(39, 41%25, 61%25)' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <Card className="bg-base-light rounded-2xl shadow-sm border overflow-hidden">
          <ProfileHeader
            profileData={profileData}
            plan={plan}
            currentUserId={currentUserId}
          />
          <CardContent className="p-6 sm:p-8">
            {deleteError && (
              <div className="mb-4 text-danger text-sm">{deleteError}</div>
            )}
            {profileData ? (
              <>
                <ProfileImagesSection
                  imageList={imageList}
                  userId={profileData.userId}
                  isLoadingImages={isLoadingImages}
                />

                <ProfileInfoSections
                  profileData={profileData}
                  userConvexData={userConvexData}
                  plan={plan}
                  activeSpotlight={activeSpotlight}
                />

                <PartnerPreferencesSection profileData={profileData} />

                <SubscriptionAndDangerSection
                  profileData={profileData}
                  plan={plan}
                  onDeleteAccount={() => setShowDeleteDialog(true)}
                  isDeleting={deleteLoading}
                />
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
        <DialogContent className="bg-base-light p-0 sm:max-w-md overflow-hidden rounded-xl border shadow-lg">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-danger/20 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.6}
                  stroke="currentColor"
                  className="h-7 w-7 text-danger"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-xl font-semibold text-danger">
                  Delete your profile?
                </DialogTitle>
                <p className="text-sm text-neutral-light leading-relaxed">
                  This will permanently remove your profile, photos, matches,
                  messages and preferences. You will not be able to recover this
                  data once deleted.
                </p>
                <ul className="mt-2 list-disc list-inside text-xs text-neutral-light space-y-1">
                  <li>Photos & messages are permanently erased</li>
                  <li>Conversations & matches will be lost</li>
                  <li>
                    You can create a new account later, but data won’t return
                  </li>
                </ul>
                {deleteError && (
                  <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-1">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 pt-4 bg-neutral/5 border-t border-neutral/10 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
              className="bg-base-light"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleteLoading}
              className="shadow-sm"
            >
              {deleteLoading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileView;
export { ProfileView };
