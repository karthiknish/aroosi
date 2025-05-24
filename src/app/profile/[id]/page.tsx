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
  handleMessage,
  handleBlock,
  handleUnblock,
} from "./profileDetailHelpers";

export default function ProfileDetailPage() {
  // All hooks must be called unconditionally and in the same order
  const { id } = useParams<{ id: Id<"users"> }>();
  const { user } = useUser();
  const router = useRouter();

  // Queries and mutations
  const data = useQuery(api.users.getUserPublicProfile, { userId: id });
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;
  const sendInterest = useMutation(
    api.interests.sendInterest
  ) as unknown as (args: {
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
  }) => Promise<any>;
  const blockUserMutation = useMutation(
    api.users.blockUser
  ) as unknown as (args: {
    blockerUserId: Id<"users">;
    blockedUserId: Id<"users">;
  }) => Promise<any>;
  const unblockUserMutation = useMutation(
    api.users.unblockUser
  ) as unknown as (args: {
    blockerUserId: Id<"users">;
    blockedUserId: Id<"users">;
  }) => Promise<any>;
  const updateProfile = useMutation(
    api.users.updateProfile
  ) as unknown as (args: { profileImageIds: Id<"_storage">[] }) => Promise<any>;

  // These queries depend on currentUserId and id, but must always be called
  const isMutualInterest = useQuery(
    api.interests.isMutualInterest,
    currentUserId && id && currentUserId !== id
      ? { userA: currentUserId, userB: id }
      : "skip"
  );
  const isBlocked = useQuery(
    api.users.isBlocked,
    currentUserId && id && currentUserId !== id
      ? { blockerUserId: currentUserId, blockedUserId: id }
      : "skip"
  );
  const sentInterest = useQuery(
    api.interests.getSentInterests,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  // For own profile, get all images with URLs
  const userProfileImages = useQuery(
    api.images.getProfileImages,
    id ? { userId: id } : "skip"
  );
  // For public profile image (for others), use batchGetProfileImages
  const userImages = useQuery(
    api.images.batchGetProfileImages,
    id ? { userIds: [id] } : { userIds: [] }
  );

  // State hooks (always called)
  const [interestSent, setInterestSent] = React.useState(false);
  const [interestError, setInterestError] = React.useState<string | null>(null);
  const [showMutualNotification, setShowMutualNotification] =
    React.useState(false);
  const [blockLoading, setBlockLoading] = React.useState(false);
  const [localImageOrder, setLocalImageOrder] = React.useState<string[]>([]);

  // Only after all hooks, do early returns
  if (
    data === undefined ||
    currentUserConvex === undefined ||
    !currentUserId ||
    !data ||
    !data.profile
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Now safe to use profile data
  const p = data.profile;
  const isOwnProfile = currentUserId && id && currentUserId === id;

  // Keep localImageOrder in sync with profile data
  React.useEffect(() => {
    setLocalImageOrder(p?.profileImageIds || []);
  }, [p?.profileImageIds]);

  // Inline derived values instead of useMemo
  const storageIdToUrl: Record<string, string> = {};
  if (userProfileImages && Array.isArray(userProfileImages)) {
    for (const img of userProfileImages) {
      if (img.url) storageIdToUrl[img.storageId] = img.url;
    }
  }
  const alreadySentInterest =
    sentInterest && Array.isArray(sentInterest)
      ? sentInterest.some((i: any) => i.toUserId === id)
      : false;

  // For public profile, imageUrls is just an array of the same url (if available)
  let imageUrls: string[] = [];
  if (!isOwnProfile && p.profileImageIds && userImages && userImages[id]) {
    imageUrls = p.profileImageIds
      .map(() => userImages[id])
      .filter((url): url is string => typeof url === "string");
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
              (!isOwnProfile && userImages && userImages[id])) ? (
              <div className="relative w-full h-72">
                <Image
                  src={
                    isOwnProfile
                      ? storageIdToUrl[localImageOrder[0]] || "/placeholder.png"
                      : (userImages && userImages[id]) || "/placeholder.png"
                  }
                  alt={p.fullName || "Profile"}
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
                {p.fullName}
              </div>
              <div
                className="text-lg text-gray-600 mb-1"
                style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
              >
                {p.ukCity || "-"}
              </div>
              <div
                className="text-lg text-gray-600 mb-1"
                style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
              >
                {p.religion || "-"}
              </div>
              <div className="text-sm text-gray-400 mb-2">
                Member since:{" "}
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
              </div>
            </div>

            {localImageOrder && localImageOrder.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                {localImageOrder.map((imgId, idx) => {
                  const url = isOwnProfile
                    ? storageIdToUrl[imgId]
                    : userImages && userImages[id];
                  return (
                    <div
                      key={imgId}
                      className="relative aspect-square flex flex-col items-center"
                    >
                      {url ? (
                        <Image
                          src={url}
                          alt={`${p.fullName || "Profile"}'s profile`}
                          fill
                          className="object-cover rounded-lg"
                        />
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
                            onClick={() =>
                              handleMoveImage({
                                fromIdx: idx,
                                toIdx: idx - 1,
                                isOwnProfile,
                                localImageOrder,
                                setLocalImageOrder,
                                updateProfile,
                              })
                            }
                            aria-label="Move Left"
                          >
                            ←
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={idx === localImageOrder.length - 1}
                            onClick={() =>
                              handleMoveImage({
                                fromIdx: idx,
                                toIdx: idx + 1,
                                isOwnProfile,
                                localImageOrder,
                                setLocalImageOrder,
                                updateProfile,
                              })
                            }
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
                <ProfileDetailView label="Religion" value={p.religion} />
                <ProfileDetailView
                  label="Mother Tongue"
                  value={p.motherTongue}
                />
                <ProfileDetailView
                  label="Marital Status"
                  value={p.maritalStatus}
                />
              </DisplaySection>
              <DisplaySection title="Education & Career">
                <ProfileDetailView label="Education" value={p.education} />
                <ProfileDetailView label="Occupation" value={p.occupation} />
                <ProfileDetailView label="Height" value={p.height} />
              </DisplaySection>
              <DisplaySection title="Location (UK)">
                <ProfileDetailView label="City" value={p.ukCity} />
              </DisplaySection>
              <DisplaySection title="About Me">
                <ProfileDetailView label="Bio" value={p.aboutMe} isTextArea />
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
                  onClick={
                    isBlocked
                      ? () =>
                          handleUnblock({
                            setBlockLoading,
                            unblockUserMutation,
                            currentUserId: currentUserId as Id<"users">,
                            id: id as Id<"users">,
                          })
                      : () =>
                          handleBlock({
                            setBlockLoading,
                            blockUserMutation,
                            currentUserId: currentUserId as Id<"users">,
                            id: id as Id<"users">,
                          })
                  }
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
                    onClick={() =>
                      handleExpressInterest({
                        setInterestError,
                        sendInterest,
                        currentUserId: currentUserId as Id<"users">,
                        id: id as Id<"users">,
                        setInterestSent,
                      })
                    }
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
                <Button
                  className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                  onClick={() => handleMessage({ router, id })}
                >
                  Message
                </Button>
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
