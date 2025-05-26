"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useForm, Controller } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { Loader2, MapPin, Search, UserCircle } from "lucide-react";
import { useState } from "react";

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

export default function MatchesPage() {
  const { user: clerkUser, isSignedIn } = useUser();
  const [filters, setFilters] = useState({
    distance: "",
    religion: "Any",
    minAge: "",
    maxAge: "",
    city: "",
  });
  const form = useForm({
    defaultValues: filters,
  });

  // TODO: Implement api.users.getPublicProfiles to accept filters and exclude current user
  const profiles = useQuery(api.users.getPublicProfiles, {
    ...filters,
    excludeClerkId: clerkUser?.id,
  });

  const onSubmit = (data: typeof filters) => {
    setFilters(data);
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
        {profiles === undefined ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-pink-600" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No matches found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {profiles.map((profile: any) => (
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
            ))}
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
