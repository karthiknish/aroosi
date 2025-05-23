"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, UserCircle } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function MyInterestsPage() {
  const { user: clerkUser, isSignedIn } = useUser();
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;
  // Fetch all interests sent by this user
  const sentInterests = useQuery(
    api.interests.getSentInterests,
    currentUserId ? { userId: currentUserId } : "skip"
  );

  const batchGetPublicProfiles = useAction(api.users.batchGetPublicProfiles);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = React.useState(false);

  React.useEffect(() => {
    async function fetchProfiles() {
      if (
        !sentInterests ||
        !Array.isArray(sentInterests) ||
        sentInterests.length === 0
      ) {
        setProfiles([]);
        return;
      }
      setLoadingProfiles(true);
      const userIds = sentInterests.map((interest: any) => interest.toUserId);
      const data = await batchGetPublicProfiles({ userIds });
      setProfiles(data || []);
      setLoadingProfiles(false);
    }
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentInterests]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <UserCircle className="w-20 h-20 text-gray-400 mb-4" />
        <p className="text-xl text-gray-700 mb-4">
          Please sign in to view your interests.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1
          className="text-4xl font-bold mb-8 text-center"
          style={{ fontFamily: "var(--font-lora)" }}
        >
          Profiles You've Expressed Interest In
        </h1>
        {sentInterests === undefined || loadingProfiles ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            You haven't expressed interest in any profiles yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {profiles.map(({ userId, profile }) => (
              <Card key={userId} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {profile.profileImageIds &&
                    profile.profileImageIds.length > 0 ? (
                      <img
                        src={`/api/storage/${profile.profileImageIds[0]}`}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border">
                        <UserCircle className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <CardTitle
                        className="text-lg font-semibold"
                        style={{ fontFamily: "var(--font-lora)" }}
                      >
                        {profile.fullName || "Anonymous"}
                      </CardTitle>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {profile.ukCity || "-"}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Religion:</span>{" "}
                    {profile.religion || "-"}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">About:</span>{" "}
                    {profile.aboutMe
                      ? profile.aboutMe.slice(0, 80) +
                        (profile.aboutMe.length > 80 ? "..." : "")
                      : "-"}
                  </div>
                  <Link
                    href={`/profile/${userId}`}
                    className="inline-block mt-2 text-pink-600 hover:underline font-semibold"
                  >
                    View Full Profile
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
