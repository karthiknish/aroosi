"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, UserCircle } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/components/AuthProvider";
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
  const { token } = useAuthContext();

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
    <div className="min-h-screen w-full bg-base-light pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
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
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block relative mb-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-2">
              Interests & Matches
            </h1>
            {/* Pink wavy SVG underline */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex justify-center mb-8 gap-2">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              className={`px-6 py-2 rounded-t-xl font-semibold font-nunito shadow transition-colors duration-200 focus:outline-none border-b-4 ${
                activeTab === idx
                  ? "bg-white/90 text-primary border-primary"
                  : "bg-accent-100 text-neutral hover:text-primary border-transparent"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 py-20">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {sentProfiles.map(
                ({
                  userId,
                  profile,
                }: {
                  userId: string;
                  profile: ProfileShape;
                }) => (
                  <Card
                    key={userId}
                    className="bg-white/90 rounded-2xl shadow-xl border-0 overflow-hidden"
                  >
                    <CardHeader className="bg-white/80 border-b-0 p-6 flex items-center">
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
                            className="text-lg font-serif font-bold text-primary-dark"
                            style={{ fontFamily: "var(--font-serif)" }}
                          >
                            {profile.fullName || "Anonymous"}
                          </CardTitle>
                          <div className="text-sm text-neutral flex items-center gap-1 font-nunito">
                            <MapPin className="w-4 h-4 text-accent" />{" "}
                            {profile.ukCity || "-"}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="font-nunito bg-transparent">
                      <div className="text-sm text-neutral mb-2">
                        <span className="font-semibold text-primary">
                          Religion:
                        </span>{" "}
                        {profile.religion || "-"}
                      </div>
                      <div className="text-sm text-neutral mb-2">
                        <span className="font-semibold text-primary">
                          About:
                        </span>{" "}
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
                        className="inline-block mt-2 text-primary hover:underline font-semibold"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 py-20">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {matches.map(
              ({
                userId,
                profile,
              }: {
                userId: string;
                profile: ProfileShape;
              }) => (
                <Card
                  key={userId}
                  className="bg-white/90 rounded-2xl shadow-xl border-0 overflow-hidden"
                >
                  <CardHeader className="bg-white/80 border-b-0 p-6 flex items-center">
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
                          className="text-lg font-serif font-bold text-primary-dark"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {profile.fullName || "Anonymous"}
                        </CardTitle>
                        <div className="text-sm text-neutral flex items-center gap-1 font-nunito">
                          <MapPin className="w-4 h-4 text-accent" />{" "}
                          {profile.ukCity || "-"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="font-nunito bg-transparent">
                    <div className="text-sm text-neutral mb-2">
                      <span className="font-semibold text-primary">
                        Religion:
                      </span>{" "}
                      {profile.religion || "-"}
                    </div>
                    <div className="text-sm text-neutral mb-2">
                      <span className="font-semibold text-primary">About:</span>{" "}
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
                      className="inline-block mt-2 text-primary hover:underline font-semibold"
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
