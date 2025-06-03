"use client";

import { useAuth } from "@clerk/nextjs";
import { useForm, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../../../components/ui/button";
import { MapPin, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/types/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/components/AuthProvider";

const religions = [
  "Any",
  "Christianity",
  "Islam",
  "Hinduism",
  "Sikhism",
  "Judaism",
  "Buddhism",
  "No Religion",
  "Other",
];

// Type guard for allowed genders
function isAllowedGender(
  value: string
): value is "male" | "female" | "other" | "any" {
  return ["male", "female", "other", "any"].includes(value);
}

interface FiltersState {
  distance: string;
  religion: string;
  minAge: string;
  maxAge: string;
  city: string;
}

// Define the fetch function outside the component or memoize it if it needs component scope
async function fetchProfilesAPI(filters: FiltersState, token: string | null) {
  if (!token) {
    // Or throw new Error("Token is required to fetch profiles");
    // Depending on how you want to handle this, useQuery will go into error state
    return Promise.reject(new Error("Authentication token not available."));
  }
  const params = new URLSearchParams();
  // Build params carefully based on active filters
  if (filters.city) params.append("city", filters.city);
  if (filters.religion && filters.religion !== "Any") {
    // Assuming your API takes 'religion' and not 'preferredGender' for this filter
    params.append("religion", filters.religion);
  }
  if (filters.minAge) params.append("minAge", filters.minAge);
  if (filters.maxAge) params.append("maxAge", filters.maxAge);
  // Add other filters like distance if available and needed

  const res = await fetch(`/api/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to parse error response" }));
    throw new Error(err?.error || "Failed to fetch matches");
  }
  return res.json();
}

export default function MatchesPage() {
  const { isSignedIn } = useAuth();
  const { token } = useAuthContext();
  const [filters, setFilters] = useState<FiltersState>({
    distance: "",
    religion: "Any",
    minAge: "",
    maxAge: "",
    city: "",
  });
  const form = useForm({
    defaultValues: filters,
  });

  // Replace useState for profiles, loading, error with useQuery
  const {
    data: profiles,
    isLoading: loading,
    error,
    // refetch, // You can use refetch if you need to trigger it manually for some reason
  } = useQuery<Profile[], Error>({
    // Specify Profile[] as TData and Error as TError
    queryKey: ["searchProfiles", filters, token], // Query key includes filters and token
    queryFn: () => fetchProfilesAPI(filters, token),
    enabled: !!isSignedIn && !!token, // Only run query if signed in and token is available
    // keepPreviousData: true, // Useful if you want to show old data while new data loads on filter change
  });

  // The old useEffect for fetching profiles is no longer needed.
  // useQuery handles fetching based on queryKey changes (e.g. when 'filters' changes).

  const onSubmit = (data: FiltersState) => {
    setFilters(data); // This will change the queryKey and trigger useQuery to refetch
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <UserCircle className="w-20 h-20 text-gray-400 mb-4" />
        <p className="text-xl text-gray-700 mb-4">
          Please sign in to browse matches.
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
          Browse Matches
        </h1>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
        >
          <div>
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => <Input {...field} placeholder="City" />}
            />
          </div>
          <div>
            <Controller
              control={form.control}
              name="religion"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {religions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Controller
              control={form.control}
              name="minAge"
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={18}
                  placeholder="Min Age"
                />
              )}
            />
          </div>
          <div>
            <Controller
              control={form.control}
              name="maxAge"
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={18}
                  placeholder="Max Age"
                />
              )}
            />
          </div>
          <div>
            <Button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              <Search className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>
        </form>
        {/* TODO: Add distance filter if user location is available */}
        {loading ? (
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
        ) : error ? (
          <div className="text-center text-red-500 py-20">{error.message}</div> // Use error.message
        ) : profiles && profiles.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No matches found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {profiles?.map((value) => {
              const profile = value as Profile | null;
              if (!profile) return null;
              return (
                <Card key={profile._id} className="shadow-md">
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
                      <span className="font-semibold">Age:</span>{" "}
                      {profile.dateOfBirth ? getAge(profile.dateOfBirth) : "-"}
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">About:</span>{" "}
                      {profile.aboutMe
                        ? profile.aboutMe.slice(0, 80) +
                          (profile.aboutMe.length > 80 ? "..." : "")
                        : "-"}
                    </div>
                    {/* TODO: Add more profile details and a 'View Profile' button */}
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

// Helper to calculate age from dateOfBirth (YYYY-MM-DD)
function getAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}
