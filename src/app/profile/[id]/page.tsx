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
import { useQuery as useConvexQuery } from "convex/react";
import Head from "next/head";

// Helper for displaying profile details
const ProfileDetailView: React.FC<{
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
}> = ({ label, value, isTextArea }) => {
  const displayValue =
    value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      {isTextArea ? (
        <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800 whitespace-pre-wrap">
          {displayValue}
        </dd>
      ) : (
        <dd className="mt-1 sm:mt-0 sm:col-span-2 text-md text-gray-800">
          {displayValue}
        </dd>
      )}
    </div>
  );
};

const DisplaySection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="space-y-1 pt-6 border-t first:border-t-0 first:pt-0">
    <h2 className="text-xl font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

export default function ProfileDetailPage() {
  // All hooks must be called unconditionally and in the same order
  const { id } = useParams<{ id: Id<"users"> }>();
  const { user } = useUser();
  const router = useRouter();

  // Queries and mutations
  const data = useQuery(api.users.getUserPublicProfile, { userId: id });
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;
  const sendInterest = useMutation(api.interests.sendInterest);
  const blockUserMutation = useMutation(api.users.blockUser);
  const unblockUserMutation = useMutation(api.users.unblockUser);
  const updateProfile = useMutation(api.users.updateProfile);

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
  const userImages = useConvexQuery(api.images.batchGetProfileImages, {
    userIds: id ? [id] : [],
  });

  // State hooks
  const [interestSent, setInterestSent] = React.useState(false);
  const [interestError, setInterestError] = React.useState<string | null>(null);
  const [showMutualNotification, setShowMutualNotification] =
    React.useState(false);
  const [blockLoading, setBlockLoading] = React.useState(false);

  // Only render after all hooks are called
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

  const p = data.profile;
  const isOwnProfile = currentUserId && id && currentUserId === id;

  // Local image order state (for own profile)
  const [localImageOrder, setLocalImageOrder] = React.useState<string[]>(
    p?.profileImageIds || []
  );

  // Keep localImageOrder in sync with profile data
  React.useEffect(() => {
    setLocalImageOrder(p?.profileImageIds || []);
  }, [p?.profileImageIds]);

  // Memoized map of storageId to url for own profile
  const storageIdToUrl = React.useMemo(() => {
    if (!userProfileImages || !Array.isArray(userProfileImages)) return {};
    const map: Record<string, string | null> = {};
    for (const img of userProfileImages) {
      map[img.storageId] = img.url;
    }
    return map;
  }, [userProfileImages]);

  // Memoized check for already sent interest
  const alreadySentInterest = React.useMemo(() => {
    if (!sentInterest || !Array.isArray(sentInterest)) return false;
    return sentInterest.some((i: any) => i.toUserId === id);
  }, [sentInterest, id]);

  // Memoized image URLs for public profile (for others)
  const imageUrls = React.useMemo(() => {
    if (!p || !p.profileImageIds || !userImages || !id || !userImages[id])
      return [];
    return p.profileImageIds.map((imgId: string) => userImages[id]);
  }, [p, userImages, id]);

  // Handle image reordering (own profile)
  const handleMoveImage = async (fromIdx: number, toIdx: number) => {
    if (!isOwnProfile) return;
    if (toIdx < 0 || toIdx >= localImageOrder.length) return;
    const newOrder = [...localImageOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setLocalImageOrder(newOrder);
    // Persist to backend
    try {
      await updateProfile({ profileImageIds: newOrder as Id<"_storage">[] });
      toast.success("Image order updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update image order");
    }
  };

  // Show notification on mutual interest
  React.useEffect(() => {
    if (isMutualInterest) {
      setShowMutualNotification(true);
      toast.success("It's a match! You can now message each other.");
    }
  }, [isMutualInterest]);

  // Express interest handler
  const handleExpressInterest = async () => {
    setInterestError(null);
    try {
      await sendInterest({ fromUserId: currentUserId, toUserId: id });
      setInterestSent(true);
    } catch (err: any) {
      setInterestError(err.message || "Could not send interest.");
    }
  };

  // Message handler
  const handleMessage = () => {
    router.push(`/messages?userId=${id}`);
  };

  // Block/unblock handlers
  const handleBlock = async () => {
    setBlockLoading(true);
    try {
      await blockUserMutation({
        blockerUserId: currentUserId,
        blockedUserId: id,
      });
      toast.success("User blocked.");
    } catch (err: any) {
      toast.error(err.message || "Could not block user.");
    } finally {
      setBlockLoading(false);
    }
  };
  const handleUnblock = async () => {
    setBlockLoading(true);
    try {
      await unblockUserMutation({
        blockerUserId: currentUserId,
        blockedUserId: id,
      });
      toast.success("User unblocked.");
    } catch (err: any) {
      toast.error(err.message || "Could not unblock user.");
    } finally {
      setBlockLoading(false);
    }
  };

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
            userImages &&
            userImages[id] ? (
              <div className="relative w-full h-72">
                <Image
                  src={userImages[id]}
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
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            aria-label="Move Left"
                          >
                            ←
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={idx === localImageOrder.length - 1}
                            onClick={() => handleMoveImage(idx, idx + 1)}
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
                  onClick={isBlocked ? handleUnblock : handleBlock}
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
                    onClick={handleExpressInterest}
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
                  onClick={handleMessage}
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
