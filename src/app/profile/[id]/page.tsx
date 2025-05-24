"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UserCircle } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import Image from "next/image";
import Head from "next/head";
import {
  ProfileDetailView,
  DisplaySection,
  handleMoveImage,
  handleExpressInterest,
  handleBlock,
  handleUnblock,
} from "./profileDetailHelpers";

export default function ProfileDetailPage() {
  // 1. Router and authentication hooks (always called first)
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  // 2. State hooks (always called in the same order)
  const [interestSent, setInterestSent] = React.useState(false);
  const [interestError, setInterestError] = React.useState<string | null>(null);
  const [showMutualNotification, setShowMutualNotification] = React.useState(false);
  const [blockLoading, setBlockLoading] = React.useState(false);
  const [localImageOrder, setLocalImageOrder] = React.useState<string[]>([]);
  
  // 3. Get the ID from params with proper type safety
  const id = params?.id as string;
  const userId = id as Id<"users">;
  
  // 4. Query hooks (always called in the same order)
  // Get current user data
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;
  
  // Get profile data
  const profileData = useQuery(
    api.users.getUserPublicProfile, 
    id ? { userId: userId } : "skip"
  );
  
  // Get relationship data
  const isMutualInterest = useQuery(
    api.interests.isMutualInterest,
    (currentUserId && id && currentUserId !== userId)
      ? { userA: currentUserId, userB: userId }
      : "skip"
  );
  
  const isBlocked = useQuery(
    api.users.isBlocked,
    (currentUserId && id && currentUserId !== userId)
      ? { blockerUserId: currentUserId, blockedUserId: userId }
      : "skip"
  );
  
  const sentInterest = useQuery(
    api.interests.getSentInterests,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  
  // 5. Mutation hooks (always called in the same order)
  const sendInterestMutation = useMutation(api.interests.sendInterest);
  const blockUserMutation = useMutation(api.users.blockUser);
  const unblockUserMutation = useMutation(api.users.unblockUser);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const updateProfileImageOrderMutation = useMutation(api.images.updateProfileImageOrder);
  
  // Get image data with enhanced error handling
  const userProfileImages = useQuery(
    api.images.getProfileImages,
    id ? { userId: userId } : "skip"
  ) || [];
  
  const userImages = useQuery(
    api.images.batchGetProfileImages,
    id ? { userIds: [userId] } : { userIds: [] }
  ) || {};
  
  const currentUserProfileImages = useQuery(
    api.images.getProfileImages,
    currentUserId ? { userId: currentUserId } : "skip"
  ) || [];
  
  // Get the first image URL for the profile
  const profileImageUrl = userProfileImages.length > 0 
    ? userProfileImages[0]?.url 
    : null;
    
  // Get all image URLs for the gallery
  const profileGalleryImages = userProfileImages.map(img => ({
    url: img.url,
    id: img.storageId,
    alt: img.fileName || 'Profile image'
  }));
  
  const blockedBy = useQuery(
    api.users.isBlocked,
    (id && currentUserId) 
      ? { blockerUserId: currentUserId, blockedUserId: userId }
      : "skip"
  );
  
  const blockedByCurrentUser = useQuery(
    api.users.isBlocked,
    (currentUserId && id) 
      ? { blockerUserId: currentUserId, blockedUserId: userId }
      : "skip"
  );
  
  const blockedCurrentUser = useQuery(
    api.users.isBlocked,
    (currentUserId && id) 
      ? { blockerUserId: userId, blockedUserId: currentUserId }
      : "skip"
  );

  // Only after all hooks, do early returns
  if (
    profileData === undefined ||
    currentUserConvex === undefined ||
    !currentUserId ||
    !profileData ||
    !profileData.profile
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Now safe to use profile data
  const profile = profileData.profile;
  const isOwnProfile = Boolean(currentUserId && id && currentUserId === userId);
  
  // Ensure we have a valid ID before using it as an index
  const safeId = userId;
  
  // Type-safe access to userImages with proper type narrowing
  const getUserImage = (userId: Id<"users"> | string | undefined): string | undefined => {
    if (!userId || !userImages) return undefined;
    // Ensure we're accessing the userImages object safely
    return (userImages as Record<string, string | undefined>)[userId.toString()];
  };

  // Keep localImageOrder in sync with profile data
  React.useEffect(() => {
    setLocalImageOrder(profile?.profileImageIds || []);
  }, [profile?.profileImageIds]);

  // Inline derived values instead of useMemo
  const storageIdToUrl: Record<string, string> = {};
  if (userProfileImages && Array.isArray(userProfileImages)) {
    for (const img of userProfileImages) {
      if (img?.url && img?.storageId) {
        storageIdToUrl[img.storageId] = img.url;
      }
    }
  }
  
  // Helper function to safely get image URL from storageId
  const getImageUrl = (storageId: string | undefined): string | undefined => {
    if (!storageId || !(storageId in storageIdToUrl)) return undefined;
    return storageIdToUrl[storageId];
  };
  
  const alreadySentInterest = Array.isArray(sentInterest) && sentInterest.length > 0 
    ? sentInterest.some((i: any) => i?.toUserId === userId)
    : false;

  // For public profile, imageUrls is just an array of the same url (if available)
  let imageUrls: string[] = [];
  if (!isOwnProfile && profile?.profileImageIds?.length && userId) {
    const userImage = getUserImage(userId);
    if (userImage) {
      // Create an array with the same length as profileImageIds
      imageUrls = Array(profile.profileImageIds.length).fill(userImage);
    }
  }

  // Show notification on mutual interest
  React.useEffect(() => {
    if (isMutualInterest) {
      setShowMutualNotification(true);
      toast.success("It's a match! You can now message each other.");
    }
  }, [isMutualInterest]);

  return (
    <>
      <Head>
        <title>View Profile | Aroosi</title>
        <meta
          name="description"
          content="View detailed profile on Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:title" content="View Profile | Aroosi" />
        <meta
          property="og:description"
          content="View detailed profile on Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://aroosi.co.uk/profile" />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="View Profile | Aroosi" />
        <meta
          name="twitter:description"
          content="View detailed profile on Aroosi, the UK's trusted Muslim matrimony platform."
        />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white py-16 px-4">
        <Card className="max-w-3xl w-full mx-auto shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="p-0">
            {localImageOrder &&
            localImageOrder.length > 0 &&
            ((isOwnProfile && storageIdToUrl[localImageOrder[0]]) ||
              (!isOwnProfile && id && getUserImage(id))) ? (
              <div className="relative w-full h-72">
                <Image
                  src={
                    isOwnProfile && localImageOrder[0]
                      ? getImageUrl(localImageOrder[0]) || "/placeholder.png"
                      : id ? (getUserImage(id) || "/placeholder.png") : "/placeholder.png"
                  }
                  alt={profile.fullName || "Profile"}
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
            ) : (
              <div className="w-full h-72 flex items-center justify-center bg-gray-100">
                <UserCircle className="w-28 h-28 text-gray-300" />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-10">
            <div className="flex flex-col items-center mb-8">
              <div
                className="text-4xl font-serif font-bold text-gray-900 mb-1"
                style={{ fontFamily: "Lora, serif" }}
              >
                {profile.fullName}
              </div>
              <div
                className="text-lg text-gray-600 mb-1"
                style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
              >
                {profile.ukCity || "-"}
              </div>
              <div
                className="text-lg text-gray-600 mb-1"
                style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
              >
                {profile.religion || "-"}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                Member since:{" "}
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
              </div>
            </div>

            {localImageOrder && localImageOrder.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {localImageOrder.map((imgId, idx) => {
                  const url = isOwnProfile
                    ? getImageUrl(imgId)
                    : id ? getUserImage(id) : undefined;
                  return (
                    <div
                      key={imgId}
                      className="relative aspect-square flex flex-col items-center"
                    >
                      {url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={url}
                            alt={`${profile.fullName || "Profile"}'s profile`}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <UserCircle className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      {isOwnProfile && localImageOrder.length > 1 && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={idx === 0}
                            onClick={async () => {
                              if (!currentUserId) return;
                              try {
                                await handleMoveImage({
                                  fromIdx: idx,
                                  toIdx: idx - 1,
                                  isOwnProfile,
                                  localImageOrder,
                                  setLocalImageOrder,
                                  updateProfileImageOrder: updateProfileImageOrderMutation,
                                  currentUserId,
                                  onError: (error) => {
                                    console.error('Error moving image:', error);
                                    toast.error(error.message);
                                  }
                                });
                              } catch (error) {
                                console.error('Unexpected error:', error);
                                toast.error('An unexpected error occurred');
                              }
                            }}
                            aria-label="Move Left"
                          >
                            ←
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={idx === localImageOrder.length - 1}
                            onClick={async () => {
                              if (!currentUserId) return;
                              try {
                                await handleMoveImage({
                                  fromIdx: idx,
                                  toIdx: idx + 1,
                                  isOwnProfile,
                                  localImageOrder,
                                  setLocalImageOrder,
                                  updateProfileImageOrder: updateProfileImageOrderMutation,
                                  currentUserId,
                                  onError: (error) => {
                                    console.error('Error moving image:', error);
                                    toast.error(error.message);
                                  }
                                });
                              } catch (error) {
                                console.error('Unexpected error:', error);
                                toast.error('An unexpected error occurred');
                              }
                            }}
                            aria-label="Move Right"
                          >
                            →
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DisplaySection title="Cultural & Religious Background">
                <ProfileDetailView label="Religion" value={profile.religion} />
                <ProfileDetailView
                  label="Mother Tongue"
                  value={profile.motherTongue}
                />
                <ProfileDetailView
                  label="Marital Status"
                  value={profile.maritalStatus}
                />
              </DisplaySection>
              <DisplaySection title="Education & Career">
                <ProfileDetailView label="Education" value={profile.education} />
                <ProfileDetailView label="Occupation" value={profile.occupation} />
                <ProfileDetailView label="Height" value={profile.height} />
              </DisplaySection>
              <DisplaySection title="Location (UK)">
                <ProfileDetailView label="City" value={profile.ukCity} />
              </DisplaySection>
              <DisplaySection title="About Me">
                <ProfileDetailView label="Bio" value={profile.aboutMe} isTextArea />
              </DisplaySection>
            </div>
            {showMutualNotification && (
              <div className="w-full text-center text-green-600 font-semibold my-6 text-lg">
                🎉 It's a match! You can now message each other.
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-4 mt-8 justify-center">
              {!isOwnProfile && (
                <Button
                  className={`w-full md:w-auto ${isBlocked ? "bg-gray-400 hover:bg-gray-500" : "bg-red-500 hover:bg-red-600"}`}
                  onClick={async () => {
                    if (!currentUserId || !userId) return;
                    setBlockLoading(true);
                    try {
                      if (isBlocked) {
                        await unblockUserMutation({
                          blockerUserId: currentUserId,
                          blockedUserId: userId,
                        } as any);
                      } else {
                        await blockUserMutation({
                          blockerUserId: currentUserId,
                          blockedUserId: userId,
                        } as any);
                      }
                    } catch (error) {
                      console.error("Error updating block status:", error);
                    } finally {
                      setBlockLoading(false);
                    }
                  }}
                  disabled={blockLoading}
                  variant={isBlocked ? "outline" : "destructive"}
                >
                  {isBlocked ? "Unblock" : "Block"}
                </Button>
              )}
              {!isOwnProfile &&
                !isBlocked &&
                !isMutualInterest &&
                !interestSent &&
                !alreadySentInterest && (
                  <Button
                    className="bg-pink-600 hover:bg-pink-700 w-full md:w-auto"
                    onClick={() => {
                      if (!currentUserId || !id) return;
                      handleExpressInterest({
                        setInterestError,
                        sendInterest: async (args: { fromUserId: Id<"users">; toUserId: Id<"users"> }) => {
                          await sendInterestMutation(args);
                        },
                        currentUserId: currentUserId as Id<"users">,
                        id: id as Id<"users">,
                        setInterestSent,
                      });
                    }}
                  >
                    Express Interest
                  </Button>
                )}
              {!isOwnProfile &&
                !isBlocked &&
                !isMutualInterest &&
                !interestSent &&
                alreadySentInterest && (
                  <div className="w-full text-center text-yellow-600 font-semibold mt-4">
                    Interest already sent!
                  </div>
                )}
              {!isOwnProfile && !isBlocked && isMutualInterest && (
                <div className="w-full text-center text-green-600 font-semibold mt-4">
                  You've connected with this user!
                </div>
              )}
              {!isOwnProfile &&
                interestSent &&
                !isMutualInterest &&
                !isBlocked && (
                  <div className="w-full text-center text-green-600 font-semibold mt-4">
                    Interest sent!
                  </div>
                )}
              {interestError && !isBlocked && (
                <div className="w-full text-center text-red-600 font-semibold mt-4">
                  {interestError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
