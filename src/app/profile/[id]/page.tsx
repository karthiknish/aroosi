"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { UserCircle, HeartIcon, HeartOffIcon } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import Image from "next/image";
import Head from "next/head";
import {
  ProfileDetailView,
  DisplaySection,
  handleExpressInterest,
  handleRemoveInterest,
} from "./profileDetailHelpers";


export default function ProfileDetailPage() {
  // 1. Router and authentication hooks (always called first)
  const params = useParams();

  // 2. State hooks (always called in the same order)
  // Local state for optimistic image reordering for the current user
  const [localCurrentUserImageOrder, setLocalCurrentUserImageOrder] =
    React.useState<string[]>([]);
  const [interestError, setInterestError] = React.useState<string | null>(null);
  const [interestSent, setInterestSent] = React.useState<boolean>(false);

  // 3. Get the ID from params with proper type safety
  const id = params?.id as string; // Page is for this user ID
  const userId = id as Id<"users">; // Typed ID for the profile being viewed

  // 4. Query hooks (ALWAYS called in the same order)
  // Get current user data
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id; // Derived: The ID of the logged-in user

  // Get profile data for the user whose profile is being viewed
  const profileData = useQuery(
    api.users.getUserPublicProfile,
    id ? { userId: userId } : "skip"
  );

  // Add block/interest queries
  const isBlocked = useQuery(
    api.users.isBlocked,
    currentUserId && userId && currentUserId !== userId
      ? { blockerUserId: currentUserId, blockedUserId: userId }
      : "skip"
  );
  const isMutualInterest = useQuery(
    api.interests.isMutualInterest,
    currentUserId && userId && currentUserId !== userId
      ? { userA: currentUserId, userB: userId }
      : "skip"
  );
  const sentInterest = useQuery(
    api.interests.getSentInterests,
    currentUserId ? { userId: currentUserId } : "skip"
  );

  // Images for the profile being viewed
  const userProfileImages =
    useQuery(
      api.images.getProfileImages,
      userId ? { userId: userId } : "skip"
    ) || [];

  // Batch get profile images (likely for multiple users, but here used for one)
  // Ensure userIds is always an array, even if empty, to maintain stable query shape
  const userImages =
    useQuery(
      api.images.batchGetProfileImages,
      userId ? { userIds: [userId] } : { userIds: [] }
    ) || {};

  // Images for the *current logged-in user* (specifically for reordering their own)
  const currentUserProfileImagesData = useQuery(
    api.images.getProfileImages,
    currentUserId ? { userId: currentUserId } : "skip"
  );

  // Derived values
  const isOwnProfile = Boolean(
    currentUserId && userId && currentUserId === userId
  );

  React.useEffect(() => {
    if (isOwnProfile && currentUserProfileImagesData) {
      // Initialize local order from fetched data when viewing own profile
      const initialOrder = currentUserProfileImagesData
        .filter((img) => img && img.storageId)
        .map((img) => img.storageId!); // map to storageId
      setLocalCurrentUserImageOrder(initialOrder);
    } else if (!isOwnProfile && profileData?.profile?.profileImageIds) {
      // For other profiles, use their fixed order
      setLocalCurrentUserImageOrder(profileData.profile.profileImageIds);
    }
    console.log("interestSent", interestSent);
  }, [
    isOwnProfile,
    currentUserProfileImagesData,
    profileData?.profile?.profileImageIds,
  ]);

  // Add mutation hooks
  const sendInterestMutation = useMutation(api.interests.sendInterest);
  const removeInterestMutation = useMutation(api.interests.removeInterest);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Early return for loading state
  if (
    profileData === undefined || // Still loading viewed profile
    currentUserConvex === undefined || // Still loading current user
    (id && !profileData) // Has ID, but profileData is null (error or not found after load)
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Handle case where profile is not found or an error occurred
  if (!profileData || !profileData.profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Profile not found.
      </div>
    );
  }

  // Now safe to use profile data
  const profile = profileData.profile;

  // Type-safe access to userImages (for non-own profile's main image)
  const getPublicUserImage = (
    targetUserId: Id<"users"> | string | undefined
  ): string | undefined => {
    if (!targetUserId || !userImages) return undefined;
    return (userImages as Record<string, string | undefined>)[
      targetUserId.toString()
    ];
  };

  // For own profile: build a map of storageId to URL from currentUserProfileImagesData
  // For viewed profile (not own): userProfileImages gives the images for that specific profile.
  const storageIdToUrlMap: Record<string, string> = {};
  const imagesToDisplay = isOwnProfile
    ? currentUserProfileImagesData || []
    : userProfileImages || [];

  if (imagesToDisplay && Array.isArray(imagesToDisplay)) {
    for (const img of imagesToDisplay) {
      if (img?.url && img?.storageId) {
        storageIdToUrlMap[img.storageId] = img.url;
      }
    }
  }

  const getImageUrlFromMap = (
    storageId: string | undefined
  ): string | undefined => {
    if (!storageId || !(storageId in storageIdToUrlMap)) return undefined;
    return storageIdToUrlMap[storageId];
  };

  // Determine the source of image IDs for mapping
  // For own profile, use the optimistically updatable localCurrentUserImageOrder
  // For other profiles, use the profileImageIds from their profile data.
  const imageIdsToRender = isOwnProfile
    ? localCurrentUserImageOrder
    : profile?.profileImageIds || [];
  const mainProfileImageId =
    imageIdsToRender.length > 0 ? imageIdsToRender[0] : undefined;
  const mainProfileImageUrl = isOwnProfile
    ? getImageUrlFromMap(mainProfileImageId)
    : userId
      ? getPublicUserImage(userId)
      : undefined;

  type Interest = { toUserId: Id<"users"> };
  const alreadySentInterest =
    Array.isArray(sentInterest) && sentInterest.length > 0
      ? sentInterest.some((i: unknown) => {
          if (typeof i === "object" && i !== null && "toUserId" in i) {
            return (i as Interest).toUserId === userId;
          }
          return false;
        })
      : false;

  return (
    <>
      <Head>
        <title>
          {profile.fullName ? `${profile.fullName}'s Profile` : "View Profile"}{" "}
          | Aroosi
        </title>
        <meta
          name="description"
          content={`View ${profile.fullName || "user"}'s detailed profile on Aroosi, the UK's trusted Muslim matrimony platform.`}
        />
        {/* ... other meta tags ... */}
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white py-16 px-4">
        <Card className="max-w-3xl w-full mx-auto shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="p-0">
            {mainProfileImageUrl ? (
              <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                <Image
                  src={mainProfileImageUrl || "/placeholder.png"}
                  alt={profile.fullName || "Profile"}
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
            ) : (
              <div className="w-full" style={{ aspectRatio: "1 / 1" }}>
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <UserCircle className="w-28 h-28 text-gray-300" />
                </div>
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
                {profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            {imageIdsToRender && imageIdsToRender.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {imageIdsToRender.map((imgId, idx) => {
                  const effectiveUrl = getImageUrlFromMap(imgId);

                  return (
                    <div
                      key={imgId}
                      className="relative w-full"
                      style={{ aspectRatio: "1 / 1" }}
                    >
                      {effectiveUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={effectiveUrl}
                            alt={`${profile.fullName || "Profile"}'s image ${idx + 1}`}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <UserCircle className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      {/* Image order update buttons removed */}
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
                <ProfileDetailView
                  label="Education"
                  value={profile.education}
                />
                <ProfileDetailView
                  label="Occupation"
                  value={profile.occupation}
                />
                <ProfileDetailView label="Height" value={profile.height} />
              </DisplaySection>
              <DisplaySection title="Location (UK)">
                <ProfileDetailView label="City" value={profile.ukCity} />
              </DisplaySection>
              <DisplaySection title="About Me">
                <ProfileDetailView
                  label="Bio"
                  value={profile.aboutMe}
                  isTextArea
                />
              </DisplaySection>
            </div>
            <div className="flex justify-center gap-8 mt-8 mb-2">
              {!isOwnProfile &&
                !isBlocked &&
                !isMutualInterest &&
                !alreadySentInterest && (
                  <button
                    className="flex items-center justify-center rounded-full bg-pink-600 hover:bg-pink-700 text-white p-4 shadow-lg transition-colors"
                    onClick={() => {
                      if (!currentUserId || !userId) return;
                      handleExpressInterest({
                        setInterestError,
                        setInterestSent,
                        sendInterestMutation: sendInterestMutation as (args: {
                          fromUserId: Id<"users">;
                          toUserId: Id<"users">;
                        }) => Promise<unknown>,
                        currentUserId,
                        id: userId,
                      });
                    }}
                    title="Express Interest"
                    aria-label="Express Interest"
                  >
                    <HeartIcon className="w-10 h-10" />
                  </button>
                )}
              {!isOwnProfile &&
                !isBlocked &&
                !isMutualInterest &&
                alreadySentInterest && (
                  <button
                    className="flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-pink-600 p-4 border border-gray-300 shadow-lg transition-colors"
                    onClick={() => {
                      if (!currentUserId || !userId) return;
                      handleRemoveInterest({
                        setInterestError,
                        setInterestSent,
                        removeInterestMutation:
                          removeInterestMutation as (args: {
                            fromUserId: Id<"users">;
                            toUserId: Id<"users">;
                          }) => Promise<unknown>,
                        currentUserId,
                        id: userId,
                      });
                    }}
                    title="Withdraw Interest"
                    aria-label="Withdraw Interest"
                  >
                    <HeartOffIcon className="w-10 h-10" />
                  </button>
                )}
            </div>
            {interestError && (
              <div className="text-center text-red-600 text-sm mt-2">
                {interestError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}