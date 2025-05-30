"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, UserCircle } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/components/TokenProvider";
import { useQuery } from "@tanstack/react-query";

const TABS = ["Interests", "Matches"];

type ProfileShape = {
  profileImageIds?: string[];
  fullName?: string;
  ukCity?: string;
  religion?: string;
  aboutMe?: string;
  [key: string]: unknown;
};

export default function InterestsMatchesPage() {
  const { user: isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const token = useToken();

  // Fetch current userId
  const { data: currentUserData, isLoading: loadingCurrentUser } = useQuery({
    queryKey: ["currentUserId", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?._id || null;
    },
    enabled: !!token,
  });
  const currentUserId = currentUserData;

  // Fetch sent interests
  const { data: sentInterests = [], isLoading: loadingSentInterests } =
    useQuery({
      queryKey: ["sentInterests", currentUserId, token],
      queryFn: async () => {
        if (!token || !currentUserId) return [];
        const res = await fetch(`/api/interests?userId=${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        return await res.json();
      },
      enabled: !!token && !!currentUserId,
    });

  // Fetch profiles for sent interests
  const { data: sentProfiles = [], isLoading: loadingSentProfiles } = useQuery({
    queryKey: ["sentProfiles", sentInterests, token],
    queryFn: async () => {
      if (
        !token ||
        !sentInterests ||
        !Array.isArray(sentInterests) ||
        sentInterests.length === 0
      ) {
        return [];
      }
      const userIds = sentInterests.map(
        (interest: { toUserId: string }) => interest.toUserId
      );
      const res = await fetch("/api/profile/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled:
      !!token && Array.isArray(sentInterests) && sentInterests.length > 0,
  });

  // Fetch matches
  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["matches", currentUserId, token],
    queryFn: async () => {
      if (!token || !currentUserId) return [];
      const res = await fetch(`/api/matches?userId=${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!token && !!currentUserId,
  });

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <UserCircle className="w-20 h-20 text-gray-400 mb-4" />
        <p className="text-xl text-gray-700 mb-4">
          Please sign in to view your interests and matches.
        </p>
      </div>
    );
  }

  if (
    (typeof loadingCurrentUser !== "undefined" && loadingCurrentUser) ||
    (typeof loadingSentInterests !== "undefined" && loadingSentInterests) ||
    (typeof loadingSentProfiles !== "undefined" && loadingSentProfiles) ||
    (typeof loadingMatches !== "undefined" && loadingMatches)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-6 w-40 rounded ml-4" />
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
          Interests &amp; Matches
        </h1>
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              className={`px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 focus:outline-none ${
                activeTab === idx
                  ? "bg-white text-pink-600 border-b-2 border-pink-600"
                  : "bg-gray-100 text-gray-500 hover:text-pink-600"
              }`}
              onClick={() => setActiveTab(idx)}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {activeTab === 0 ? (
          // Interests Tab
          sentInterests === undefined || loadingSentProfiles ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-20">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
                >
                  <Skeleton className="w-full h-32 rounded-xl" />
                  <Skeleton className="h-6 w-2/3 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : sentProfiles.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              You haven&apos;t expressed interest in any profiles yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {sentProfiles.map(
                ({
                  userId,
                  profile,
                }: {
                  userId: string;
                  profile: ProfileShape;
                }) => (
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
                            <MapPin className="w-4 h-4" />{" "}
                            {profile.ukCity || "-"}
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
                      {/* Convex user IDs are 15+ chars, Clerk IDs start with 'user_' */}
                      {userId.startsWith("user_") && (
                        <div className="text-red-600 text-xs mb-2">
                          Internal error: Invalid user ID for navigation (Clerk
                          ID detected)
                        </div>
                      )}
                      <Link
                        href={
                          userId.startsWith("user_")
                            ? "#"
                            : `/profile/${userId}`
                        }
                        onClick={(e) => {
                          if (userId.startsWith("user_")) {
                            e.preventDefault();
                            console.warn(
                              "Attempted to navigate with Clerk ID instead of Convex user ID:",
                              userId
                            );
                            alert(
                              "Internal error: Invalid user ID for navigation."
                            );
                          }
                        }}
                        className="inline-block mt-2 text-pink-600 hover:underline font-semibold"
                      >
                        View Full Profile
                      </Link>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )
        ) : // Matches Tab
        loadingMatches ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
              >
                <Skeleton className="w-full h-32 rounded-xl" />
                <Skeleton className="h-6 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            You don&apos;t have any matches yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {matches.map(
              ({
                userId,
                profile,
              }: {
                userId: string;
                profile: ProfileShape;
              }) => (
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
                    {/* Convex user IDs are 15+ chars, Clerk IDs start with 'user_' */}
                    {userId.startsWith("user_") && (
                      <div className="text-red-600 text-xs mb-2">
                        Internal error: Invalid user ID for navigation (Clerk ID
                        detected)
                      </div>
                    )}
                    <Link
                      href={
                        userId.startsWith("user_") ? "#" : `/profile/${userId}`
                      }
                      onClick={(e) => {
                        if (userId.startsWith("user_")) {
                          e.preventDefault();
                          console.warn(
                            "Attempted to navigate with Clerk ID instead of Convex user ID:",
                            userId
                          );
                          alert(
                            "Internal error: Invalid user ID for navigation."
                          );
                        }
                      }}
                      className="inline-block mt-2 text-pink-600 hover:underline font-semibold"
                    >
                      View Full Profile
                    </Link>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
