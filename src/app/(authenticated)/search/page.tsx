"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";

const majorUkCities = [
  "London",
  "Birmingham",
  "Manchester",
  "Leeds",
  "Glasgow",
  "Liverpool",
  "Newcastle",
  "Sheffield",
  "Bristol",
  "Leicester",
  "Edinburgh",
  "Nottingham",
  "Southampton",
  "Cardiff",
  "Coventry",
  "Bradford",
  "Belfast",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Plymouth",
  "Derby",
  "Swansea",
  "Sunderland",
  "Luton",
  "Preston",
  "Aberdeen",
  "Norwich",
  "Portsmouth",
  "York",
  "Milton Keynes",
  "Reading",
  "Huddersfield",
  "Peterborough",
  "Blackpool",
  "Bolton",
  "Ipswich",
  "Middlesbrough",
  "Woking",
  "Slough",
  "Cambridge",
  "Exeter",
  "Bath",
  "Oxford",
  "Chelmsford",
  "Colchester",
  "Crawley",
  "Gillingham",
  "Hastings",
  "High Wycombe",
  "Maidstone",
  "Poole",
  "Rochdale",
  "Solihull",
  "Stockport",
  "Warrington",
  "Watford",
  "Wokingham",
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
  const { token, isLoaded, isSignedIn } = useAuthContext();
  const router = useRouter();
  const [city, setCity] = React.useState("any");
  const [religion, setReligion] = React.useState("any");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [imgLoaded, setImgLoaded] = useState<{ [userId: string]: boolean }>({});
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);

  // Redirect to sign-in if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch search results function
  const fetchSearchResults = async () => {
    if (!token) return { profiles: [], total: 0 };

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (city && city !== "any") params.append("city", city);
      if (religion && religion !== "any") params.append("religion", religion);
      if (ageMin) params.append("ageMin", ageMin);
      if (ageMax) params.append("ageMax", ageMax);

      const response = await fetch(`/api/search?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      console.log("Search API response:", data);
      return {
        profiles: Array.isArray(data.profiles) ? data.profiles : [],
        total: typeof data.total === "number" ? data.total : 0,
      };
    } catch (error) {
      console.error("Error fetching search results:", error);
      return { profiles: [], total: 0 };
    }
  };

  // React Query for profiles
  const { data: searchResults, isLoading: loadingProfiles } = useQuery({
    queryKey: [
      "profiles",
      token,
      city,
      religion,
      ageMin,
      ageMax,
      page,
      pageSize,
    ],
    queryFn: fetchSearchResults,
    enabled: !!token && isSignedIn,
  });

  // Extract profiles and total from search results
  const { profiles = [], total: totalResults = 0 } = searchResults || {};

  // Update total count for pagination
  useEffect(() => {
    if (typeof totalResults === "number") {
      setTotal(totalResults);
    }
  }, [totalResults]);

  // React Query for user images
  const { data: userImages = {}, isLoading: loadingImages } = useQuery({
    queryKey: ["userImages", token, profiles],
    queryFn: async () => {
      try {
        if (!token) {
          console.warn("No auth token available for images batch request");
          return {};
        }

        if (!profiles || profiles.length === 0) {
          console.log("No profiles available to fetch images for");
          return {};
        }

        const userIds = profiles
          .map((u: ProfileSearchResult) => u.userId)
          .filter(Boolean);

        if (userIds.length === 0) {
          console.log("No valid user IDs found for image batch request");
          return {};
        }

        console.log("Fetching images for user IDs:", userIds);
        const res = await fetch(
          `/api/images/batch?userIds=${userIds.join(",")}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Batch images API error:", {
            status: res.status,
            statusText: res.statusText,
            error: errorText,
            userIds,
            hasAuthHeader: !!token,
          });
          return {};
        }

        return await res.json();
      } catch (error) {
        console.error("Error in images batch request:", error);
        return {};
      }
    },
    enabled: !!token && profiles.length > 0,
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
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

  // Get current user from auth context
  const { profile: currentUser } = useAuthContext();

  // Filter out current user and incomplete profiles
  const filtered = useMemo(() => {
    return (publicProfiles || []).filter((u: ProfileSearchResult) => {
      if (!u.profile?.isProfileComplete || u.profile?.hiddenFromSearch)
        return false;
      if (currentUser) {
        if (u.userId === currentUser.userId) return false;
        if (
          u.email &&
          currentUser.email &&
          u.email.toLowerCase() === currentUser.email.toLowerCase()
        ) {
          return false;
        }
      }
      return true;
    });
  }, [publicProfiles, currentUser]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen w-full bg-green-50 pt-24 sm:pt-28 md:pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-10 text-center">
          <h1
            className="text-4xl sm:text-5xl font-serif font-bold text-red-600 mb-4"
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
        userImages === undefined ? (
          // Show loading skeleton when data is being fetched
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
        ) : filtered.length === 0 ? (
          // Show 'No profiles found' message when there are no results
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No profiles found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {city !== "any" || religion !== "any" || ageMin || ageMax
                ? "Try adjusting your search criteria to see more results."
                : "There are currently no profiles available. Please check back later."}
            </p>
            {(city !== "any" || religion !== "any" || ageMin || ageMax) && (
              <button
                onClick={() => {
                  setCity("any");
                  setReligion("any");
                  setAgeMin("");
                  setAgeMax("");
                }}
                className="mt-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Clear all filters
              </button>
            )}
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
                        className="bg-red-600 hover:bg-red-700 w-full mt-2"
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
