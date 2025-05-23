"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UserCircle } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import Image from "next/image";
import { useQuery as useConvexQuery } from "convex/react";

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
  const { id } = useParams<{ id: Id<"users"> }>();
  const { user } = useUser();
  const router = useRouter();
  // Always call all hooks at the top level
  const data = useQuery(api.users.getUserPublicProfile, { userId: id });
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;
  const sendInterest = useMutation(api.interests.sendInterest);
  const isMutualInterest = useQuery(
    api.interests.isMutualInterest,
    currentUserId && id && currentUserId !== id
      ? { userA: currentUserId, userB: id }
      : "skip"
  );
  const [interestSent, setInterestSent] = React.useState(false);
  const [interestError, setInterestError] = React.useState<string | null>(null);
  const [showMutualNotification, setShowMutualNotification] =
    React.useState(false);
  const blockUserMutation = useMutation(api.users.blockUser);
  const unblockUserMutation = useMutation(api.users.unblockUser);
  const isBlocked = useQuery(
    api.users.isBlocked,
    currentUserId && id && currentUserId !== id
      ? { blockerUserId: currentUserId, blockedUserId: id }
      : "skip"
  );
  const [blockLoading, setBlockLoading] = React.useState(false);
  const sentInterest = useQuery(
    api.interests.getSentInterests,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  const alreadySentInterest = React.useMemo(() => {
    if (!sentInterest || !Array.isArray(sentInterest)) return false;
    return sentInterest.some((i: any) => i.toUserId === id);
  }, [sentInterest, id]);
  React.useEffect(() => {
    if (isMutualInterest) {
      setShowMutualNotification(true);
      toast.success("It's a match! You can now message each other.");
    }
  }, [isMutualInterest]);
  const userImages = useConvexQuery(api.images.batchGetProfileImages, {
    userIds: id ? [id] : [],
  });
  // Only render after all hooks are called
  if (
    data === undefined ||
    currentUserConvex === undefined ||
    !currentUserId ||
    userImages === undefined
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Loading...
      </div>
    );
  }
  if (!data || !data.profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-pink-700 mb-4">
          Profile Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          Sorry, we couldn't find that profile.
        </p>
      </div>
    );
  }
  const p = data.profile;
  const isOwnProfile = currentUserId && id && currentUserId === id;
  const imageUrls = React.useMemo(() => {
    if (!p || !p.profileImageIds || !userImages || !id || !userImages[id])
      return [];
    return p.profileImageIds.map((imgId: string) => userImages[id]);
  }, [p, userImages, id]);

  const handleExpressInterest = async () => {
    setInterestError(null);
    try {
      await sendInterest({ fromUserId: currentUserId, toUserId: id });
      setInterestSent(true);
    } catch (err: any) {
      setInterestError(err.message || "Could not send interest.");
    }
  };

  const handleMessage = () => {
    router.push(`/messages?userId=${id}`);
  };

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white py-16 px-4">
      <Card className="max-w-3xl w-full mx-auto shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="p-0">
          {imageUrls && imageUrls.length > 0 && imageUrls[0] ? (
            <div className="relative w-full h-72">
              <Image
                src={imageUrls[0]}
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

          {imageUrls && imageUrls.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {imageUrls.slice(1).map((url, idx) =>
                url ? (
                  <div key={idx} className="relative aspect-square">
                    <Image
                      src={url}
                      alt={`${p.fullName || "Profile"}'s profile`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ) : null
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DisplaySection title="Cultural & Religious Background">
              <ProfileDetailView label="Religion" value={p.religion} />
              <ProfileDetailView label="Mother Tongue" value={p.motherTongue} />
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
  );
}
