"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockedUserBanner } from "@/components/safety/BlockedUserBanner";
import { ReportUserDialog } from "@/components/safety/ReportUserDialog";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { IcebreakersPanel } from "./IcebreakersPanel";

import { useProfileDetailLogic } from "@/hooks/useProfileDetailLogic";
import { ProfileGallery } from "@/components/profile/detail/ProfileGallery";
import { ProfileHeader } from "@/components/profile/detail/ProfileHeader";
import { ProfileInfoSections } from "@/components/profile/detail/ProfileInfoSections";
import { ProfileInteraction } from "@/components/profile/detail/ProfileInteraction";
import { PageLoader } from "@/components/ui/PageLoader";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, type: "spring" as const },
  },
  exit: { opacity: 0, y: 40, transition: { duration: 0.3 } },
};

export default function ProfileDetailPage() {
  const {
    userId,
    profile,
    isOwnProfile,
    loadingProfile,
    profileError,
    profileApiError,
    refetchProfile,
    imagesToShow,
    currentImageIdx,
    setCurrentImageIdx,
    interestState,
    isBlocked,
    isBlockedBy,
    showReportModal,
    setShowReportModal,
    handleUnblockUser,
    compatData,
    isPremiumPlus,
    networkStatus,
    trackUsage,
  } = useProfileDetailLogic();

  if (!networkStatus.isOnline) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState />
      </div>
    );
  }

  const isAuthError = (profileError as any)?.code === "AUTH_REQUIRED";
  if (profileError && !isAuthError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState onRetry={() => refetchProfile()} />
      </div>
    );
  }

  if (loadingProfile || isAuthError) {
    return <PageLoader message={isAuthError ? "Authorizing..." : "Loading profile..."} />;
  }

  if (!profile) {
    const errorMessage = profileApiError?.message || profileApiError?.code || "Profile not found.";
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState message={errorMessage} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const canInteract = !isBlocked && !isBlockedBy;

  return (
    <>
      <ReportUserDialog
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userId={userId}
        userName={profile?.fullName}
        onReportSuccess={() => {
          trackUsage({
            feature: "user_report" as any,
            metadata: { targetUserId: userId },
          });
        }}
        onBlockSuccess={() => {
          trackUsage({
            feature: "user_block" as any,
            metadata: { targetUserId: userId },
          });
        }}
      />

      <div className="relative w-full min-h-screen overflow-hidden bg-base-light py-16 px-4 flex items-center justify-center">
        {/* Background Decor */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <motion.div
          key="profile-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="max-w-4xl w-full mx-auto"
        >
          <Card className="shadow-xl rounded-3xl overflow-hidden bg-base-light/80 backdrop-blur-sm border border-base-light/50 z-10">
            <CardHeader className="p-0 relative">
              {/* Safety Actions */}
              {!isOwnProfile && (
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="bg-base-light/95 hover:bg-base-light text-neutral-dark border border-neutral/20 shadow-sm rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Safety
                  </Button>
                  {isBlocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleUnblockUser}
                      className="bg-base-light/95 hover:bg-base-light text-neutral-dark border border-neutral/20 shadow-sm rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      Unblock
                    </Button>
                  )}
                </div>
              )}

              <ProfileGallery
                imagesToShow={imagesToShow}
                currentImageIdx={currentImageIdx}
                setCurrentImageIdx={setCurrentImageIdx}
                fullName={profile.fullName}
              />
            </CardHeader>

            <CardContent className="p-0 font-nunito bg-transparent overflow-hidden">
              {/* Blocked User Banner */}
              {!isOwnProfile && (isBlocked || isBlockedBy) && (
                <div className="px-6 md:px-10 pt-6">
                  <BlockedUserBanner
                    isBlocked={isBlocked}
                    isBlockedBy={isBlockedBy}
                    userName={profile?.fullName}
                    onUnblock={handleUnblockUser}
                    className="mb-6"
                  />
                </div>
              )}

              <div className="pt-8">
                <ProfileHeader
                  profile={profile}
                  isOwnProfile={isOwnProfile}
                  isPremiumPlus={isPremiumPlus}
                  interestStatus={interestState.interestStatusData?.status}
                  compatScore={compatData?.score}
                />

                <ProfileInfoSections profile={profile} />

                {/* About Me */}
                <div className="space-y-4 mb-8 px-6 md:px-10">
                  <h3 className="font-serif font-semibold mb-4 flex items-center gap-2 text-neutral-dark text-xl border-b border-neutral/10 pb-2">
                    About Me
                  </h3>
                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                    <p className="text-neutral-dark leading-relaxed whitespace-pre-wrap">
                      {profile?.aboutMe ?? "No description provided."}
                    </p>
                  </div>
                </div>

                {isOwnProfile && (
                  <div className="px-6 md:px-10 mb-8">
                    <IcebreakersPanel />
                  </div>
                )}

                <ProfileInteraction
                  interestState={interestState}
                  canInteract={canInteract}
                  isOwnProfile={isOwnProfile}
                />

                {!isOwnProfile && (
                  <div className="flex justify-center my-10 px-6 md:px-10">
                    <ProfileActions toUserId={String(userId)} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
