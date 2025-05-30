"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";
import React, { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/components/TokenProvider";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const majorUkCities = [
  "Belfast",
  "Birmingham",
  "Bradford",
  "Brighton",
  "Bristol",
  "Cambridge",
  "Cardiff",
  "Coventry",
  "Derby",
  "Edinburgh",
  "Glasgow",
  "Kingston upon Hull",
  "Leeds",
  "Leicester",
  "Liverpool",
  "London",
  "Manchester",
  "Milton Keynes",
  "Newcastle upon Tyne",
  "Newport",
  "Norwich",
  "Nottingham",
  "Oxford",
  "Plymouth",
  "Portsmouth",
  "Preston",
  "Reading",
  "Sheffield",
  "Southampton",
  "Stoke-on-Trent",
  "Sunderland",
  "Swansea",
  "Wakefield",
  "Wolverhampton",
  "York",
];
const cityOptions = ["any", ...majorUkCities.sort()];

function getAge(dateOfBirth: string) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) ? "-" : age;
}

// Types for search results
interface ProfileData {
  fullName: string;
  ukCity?: string;
  dateOfBirth?: string;
  religion?: string;
  isProfileComplete?: boolean;
  hiddenFromSearch?: boolean;
  [key: string]: unknown;
}
interface ProfileSearchResult {
  userId: string;
  email?: string;
  profile: ProfileData;
}

export default function SearchProfilesPage() {
  const { user, isLoaded } = useUser();
  const token = useToken();
  const router = useRouter();
  const [city, setCity] = React.useState("any");
  const [religion, setReligion] = React.useState("any");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [imgLoaded, setImgLoaded] = useState<{ [userId: string]: boolean }>({});
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);

  // React Query for current user profile
  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserProfile", token],
    queryFn: async () => {
      if (!token) return undefined;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return undefined;
      return await res.json();
    },
    enabled: !!token,
  });

  // Compute preferredGender before using it in queries
  const preferredGender =
    typeof currentUserProfile === "object" &&
    currentUserProfile &&
    "profile" in currentUserProfile &&
    typeof currentUserProfile.profile === "object" &&
    currentUserProfile.profile &&
    "preferredGender" in currentUserProfile.profile
      ? (currentUserProfile.profile as { preferredGender?: string })
          .preferredGender || "any"
      : "any";

  // React Query for profiles
  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: [
      "profiles",
      token,
      city,
      religion,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
    ],
    queryFn: async () => {
      if (!token) return [];
      const params = new URLSearchParams();
      if (city && city !== "any") params.append("city", city);
      if (religion && religion !== "any") params.append("religion", religion);
      if (ageMin) params.append("ageMin", ageMin);
      if (ageMax) params.append("ageMax", ageMax);
      if (preferredGender && preferredGender !== "any")
        params.append("preferredGender", preferredGender);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      const res = await fetch(`/api/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      setTotal(data.total ?? 0);
      return Array.isArray(data.profiles) ? data.profiles : data;
    },
    enabled: !!token,
  });
  const profiles = profilesData || [];

  // React Query for user images
  const { data: userImages = {}, isLoading: loadingImages } = useQuery({
    queryKey: ["userImages", token, profiles],
    queryFn: async () => {
      if (!token || !profiles || profiles.length === 0) return {};
      const userIds = profiles
        .map((u: ProfileSearchResult) => u.userId)
        .filter(Boolean);
      if (userIds.length === 0) return {};
      const res = await fetch(
        `/api/images/batch?userIds=${userIds.join(",")}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return {};
      return await res.json();
    },
    enabled: !!token && profiles.length > 0,
  });

  // Only show users with a complete profile and not hidden from search
  const publicProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(
      (u: ProfileSearchResult) =>
        u.profile && u.profile.isProfileComplete && !u.profile.hiddenFromSearch
    );
  }, [profiles]);

  // Get unique cities and religions for filter dropdowns
  const religionOptions = React.useMemo(() => {
    const set = new Set(
      publicProfiles
        .map((u: ProfileSearchResult) => u.profile!.religion)
        .filter(
          (v: unknown): v is string => typeof v === "string" && v.length > 0
        )
    );
    return ["any", ...Array.from(set)];
  }, [publicProfiles]);

  // Filtering logic (exclude logged-in user's own profile by Clerk ID or email)
  const filtered = React.useMemo(() => {
    return publicProfiles.filter((u: ProfileSearchResult) => {
      // Exclude the logged-in user's own profile by Clerk ID or email
      if (user) {
        if (u.userId === user.id) return false;
        if (
          u.email &&
          user.emailAddresses?.some(
            (e: { emailAddress: string }) =>
              e.emailAddress.toLowerCase() === (u.email?.toLowerCase() ?? "")
          )
        )
          return false;
      }
      return true;
    });
  }, [publicProfiles, user]);

  const totalPages = Math.ceil(total / pageSize);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pink-600 mb-2">
            Sign in to search profiles
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            You must be logged in to view and search profiles on Aroosi.
          </p>
          <SignInButton mode="modal">
            <span className="inline-block bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition cursor-pointer">
              Sign In
            </span>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-10 text-center">
          <h1
            className="text-4xl sm:text-5xl font-serif font-bold text-pink-600 mb-4"
            style={{ fontFamily: "Lora, serif" }}
          >
            Search Profiles
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
            Browse and filter profiles to find your ideal match on Aroosi.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Choose City" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "any" ? "Any City" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={religion} onValueChange={setReligion}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Choose Religion" />
              </SelectTrigger>
              <SelectContent>
                {(religionOptions as string[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "any" ? "Any Religion" : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={18}
              max={99}
              placeholder="Min Age"
              value={ageMin || ""}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-24 bg-white"
            />
            <Input
              type="number"
              min={18}
              max={99}
              placeholder="Max Age"
              value={ageMax || ""}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-24 bg-white"
            />
          </div>
        </section>
        {loadingProfiles ||
        loadingImages ||
        profiles === undefined ||
        userImages === undefined ||
        filtered.length === 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
              >
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="h-6 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((u: ProfileSearchResult, idx: number) => {
                const p = u.profile!;
                const firstImageUrl =
                  typeof userImages === "object" &&
                  userImages !== null &&
                  typeof u.userId === "string" &&
                  u.userId in userImages
                    ? (userImages as Record<string, string | null>)[u.userId] ||
                      null
                    : null;
                const loaded = imgLoaded[u.userId] || false;
                return (
                  <Card
                    key={typeof u.userId === "string" ? u.userId : String(idx)}
                    className="hover:shadow-xl transition-shadow border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col"
                  >
                    {firstImageUrl ? (
                      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                        {/* Skeleton loader */}
                        {!loaded && (
                          <div className="absolute inset-0 bg-gray-200 animate-pulse z-0" />
                        )}
                        <img
                          src={firstImageUrl}
                          alt={typeof p.fullName === "string" ? p.fullName : ""}
                          className={`w-full h-full object-cover transition-all duration-700 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
                          onLoad={() =>
                            setImgLoaded((prev) => ({
                              ...prev,
                              [u.userId]: true,
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-gray-100">
                        <UserCircle className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                      <div
                        className="text-xl font-serif font-bold text-gray-900 mb-1"
                        style={{ fontFamily: "Lora, serif" }}
                      >
                        {typeof p.fullName === "string" ? p.fullName : ""}
                      </div>
                      <div
                        className="text-sm text-gray-600 mb-1"
                        style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                      >
                        {typeof p.ukCity === "string" ? p.ukCity : "-"}
                      </div>
                      <div
                        className="text-sm text-gray-600 mb-1"
                        style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                      >
                        Age:{" "}
                        {getAge(
                          typeof p.dateOfBirth === "string" ? p.dateOfBirth : ""
                        )}
                      </div>
                      <div
                        className="text-sm text-gray-600 mb-2"
                        style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                      >
                        {typeof p.religion === "string" ? p.religion : "-"}
                      </div>
                      <Button
                        className="bg-pink-600 hover:bg-pink-700 w-full mt-2"
                        onClick={() => {
                          // Convex user IDs are 15+ chars, Clerk IDs start with 'user_'
                          if (
                            typeof u.userId !== "string" ||
                            u.userId.startsWith("user_")
                          ) {
                            console.warn(
                              "Attempted to navigate with Clerk ID instead of Convex user ID:",
                              u.userId
                            );
                            alert(
                              "Internal error: Invalid user ID for navigation."
                            );
                            return;
                          }
                          router.push(`/profile/${u.userId}`);
                        }}
                      >
                        {"View Profile"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
