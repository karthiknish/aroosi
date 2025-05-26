"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
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
import Link from "next/link";
import { UserCircle } from "lucide-react";
import React, { useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import type { Profile } from "@/types/profile";
import type { Id } from "convex/_generated/dataModel";

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

// Convex profile type (matches Convex schema, createdAt is number)
type ConvexProfile = {
  _id: string;
  userId: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  ukCity?: string;
  ukPostcode?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceReligion?: string[];
  partnerPreferenceUkCity?: string[];
  preferredGender?: string;
  profileImageIds?: string[];
  banned?: boolean;
  createdAt: number;
  updatedAt?: number;
  isProfileComplete?: boolean;
  hiddenFromSearch?: boolean;
};

type ConvexUserWithProfile = {
  _id: Id<"users">;
  email: string;
  role?: string;
  banned?: boolean;
  profile: ConvexProfile | null;
};

export default function SearchProfilesPage() {
  const { user, isLoaded } = useUser();
  const currentUserProfile = useQuery(api.users.getCurrentUserWithProfile, {});
  const preferredGender = currentUserProfile?.profile?.preferredGender || "any";
  const [city, setCity] = React.useState("any");
  const [religion, setReligion] = React.useState("any");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [imgLoaded, setImgLoaded] = useState<{ [userId: string]: boolean }>({});

  // Fetch profiles filtered by preferredGender (unless overridden by gender filter)
  const profiles = useQuery(api.users.listUsersWithProfiles, {
    preferredGender,
  });

  // Only show users with a complete profile and not hidden from search
  const publicProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(
      (u: ConvexUserWithProfile) =>
        u.profile && u.profile.isProfileComplete && !u.profile.hiddenFromSearch
    );
  }, [profiles]);

  // Get unique cities and religions for filter dropdowns
  const religionOptions = React.useMemo(() => {
    const set = new Set(
      publicProfiles
        .map((u: ConvexUserWithProfile) => u.profile!.religion)
        .filter(Boolean)
    );
    return ["any", ...Array.from(set)];
  }, [publicProfiles]);

  // Filtering logic (exclude logged-in user's own profile by Clerk ID or email)
  const filtered = React.useMemo(() => {
    return publicProfiles.filter((u: ConvexUserWithProfile) => {
      // Exclude the logged-in user's own profile by Clerk ID or email
      if (user) {
        if (u._id === user.id) return false;
        if (
          u.email &&
          user.emailAddresses?.some(
            (e: { emailAddress: string }) =>
              e.emailAddress.toLowerCase() === u.email.toLowerCase()
          )
        )
          return false;
      }
      const p = u.profile!;
      if (
        (city !== "any" && p.ukCity !== city) ||
        (religion !== "any" && p.religion !== religion) ||
        (preferredGender !== "any" && p.gender !== preferredGender)
      ) {
        return false;
      }
      // Age filter
      if (ageMin || ageMax) {
        const age = getAge(p.dateOfBirth!);
        if (age === "-") return false;
        if (ageMin && age < Number(ageMin)) return false;
        if (ageMax && age > Number(ageMax)) return false;
      }
      return true;
    });
  }, [publicProfiles, city, religion, ageMin, ageMax, user, preferredGender]);

  // Collect all userIds from filtered (always an array)
  const userIds = React.useMemo(
    () => filtered.map((u: ConvexUserWithProfile) => u._id),
    [filtered]
  );
  // Allow null values in userImages
  const userImages: { [userId: string]: string | null } | undefined =
    useConvexQuery(api.images.batchGetProfileImages, {
      userIds,
    });

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white">
        <div className="text-lg text-gray-500 animate-pulse">Loading...</div>
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
                {religionOptions.map((r) => (
                  <SelectItem key={r} value={r || ""}>
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
        {profiles === undefined || userImages === undefined ? (
          <div className="text-center text-gray-400 animate-pulse">
            Loading profiles...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400">
            No profiles found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((u: ConvexUserWithProfile) => {
              const p = u.profile!;
              const firstImageUrl = userImages?.[u._id] || null;
              const loaded = imgLoaded[u._id] || false;
              return (
                <Card
                  key={u._id}
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
                        alt={p.fullName}
                        className={`w-full h-full object-cover transition-all duration-700 ${loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
                        onLoad={() =>
                          setImgLoaded((prev) => ({ ...prev, [u._id]: true }))
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
                      {p.fullName}
                    </div>
                    <div
                      className="text-sm text-gray-600 mb-1"
                      style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                    >
                      {p.ukCity || "-"}
                    </div>
                    <div
                      className="text-sm text-gray-600 mb-1"
                      style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                    >
                      Age: {getAge(p.dateOfBirth || "")}
                    </div>
                    <div
                      className="text-sm text-gray-600 mb-2"
                      style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                    >
                      {p.religion || "-"}
                    </div>
                    <Button
                      asChild
                      className="bg-pink-600 hover:bg-pink-700 w-full mt-2"
                    >
                      <Link href={`/profile/${u._id}`}>View Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
