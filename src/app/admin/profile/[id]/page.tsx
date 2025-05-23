"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
  Eye,
  MapPin,
  UserCircle,
  Heart,
  Phone,
  GraduationCap,
  Briefcase,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";

export default function AdminProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center text-pink-600">
        Loading authentication...
      </div>
    );
  if (!isSignedIn)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        You must be signed in as an admin.
      </div>
    );

  const profile = useQuery(api.users.getProfileById, {
    id: id as Id<"profiles">,
  });
  const matches = useQuery(api.users.getMatchesForProfile, {
    profileId: id as Id<"profiles">,
  });

  if (profile === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center text-pink-600">
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Profile not found
      </div>
    );

  const profileImageUrl =
    profile.profileImageIds && profile.profileImageIds.length > 0
      ? `/api/storage/${profile.profileImageIds[0]}`
      : null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-2">
      <Card className="mb-8 shadow-xl">
        <CardContent className="pt-8 pb-10 px-6 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={profile.fullName || "Profile"}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
                <UserCircle className="w-20 h-20 text-gray-300" />
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {profile.fullName || "Unnamed"}
          </div>
          <div className="text-md text-gray-600 flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" /> {profile.ukCity || "-"}
          </div>
          <div className="flex flex-wrap gap-4 justify-center mb-4">
            <div className="flex items-center gap-1 text-gray-500">
              <Heart className="w-4 h-4" /> {profile.religion || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <GraduationCap className="w-4 h-4" /> {profile.education || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Briefcase className="w-4 h-4" /> {profile.occupation || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Phone className="w-4 h-4" /> {profile.phoneNumber || "-"}
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-2">
            Profile ID: {profile._id}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <span className="font-semibold">Date of Birth:</span>{" "}
              {profile.dateOfBirth || "-"}
            </div>
            <div>
              <span className="font-semibold">Gender:</span>{" "}
              {profile.gender || "-"}
            </div>
            <div>
              <span className="font-semibold">Postcode:</span>{" "}
              {profile.ukPostcode || "-"}
            </div>
            <div>
              <span className="font-semibold">Caste:</span>{" "}
              {profile.caste || "-"}
            </div>
            <div>
              <span className="font-semibold">Mother Tongue:</span>{" "}
              {profile.motherTongue || "-"}
            </div>
            <div>
              <span className="font-semibold">Height:</span>{" "}
              {profile.height || "-"}
            </div>
            <div>
              <span className="font-semibold">Marital Status:</span>{" "}
              {profile.maritalStatus || "-"}
            </div>
            <div>
              <span className="font-semibold">Annual Income:</span>{" "}
              {profile.annualIncome || "-"}
            </div>
            <div>
              <span className="font-semibold">Diet:</span> {profile.diet || "-"}
            </div>
            <div>
              <span className="font-semibold">Smoking:</span>{" "}
              {profile.smoking || "-"}
            </div>
            <div>
              <span className="font-semibold">Drinking:</span>{" "}
              {profile.drinking || "-"}
            </div>
            <div>
              <span className="font-semibold">Physical Status:</span>{" "}
              {profile.physicalStatus || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">About Me:</span>{" "}
              <span className="text-gray-700">{profile.aboutMe || "-"}</span>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Partner Preference Age:</span>{" "}
              {profile.partnerPreferenceAgeMin || "-"} -{" "}
              {profile.partnerPreferenceAgeMax || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">
                Partner Preference Religion:
              </span>{" "}
              {profile.partnerPreferenceReligion?.join(", ") || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Partner Preference UK City:</span>{" "}
              {profile.partnerPreferenceUkCity?.join(", ") || "-"}
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Banned:</span>{" "}
              {profile.banned ? "Yes" : "No"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Created At:</span>{" "}
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleString()
                : "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Updated At:</span>{" "}
              {profile.updatedAt
                ? new Date(profile.updatedAt).toLocaleString()
                : "-"}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {matches && matches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {matches.map((m: any) => {
                const matchImageUrl =
                  m.profileImageIds && m.profileImageIds.length > 0
                    ? `/api/storage/${m.profileImageIds[0]}`
                    : null;
                return (
                  <div
                    key={m._id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border hover:shadow transition"
                  >
                    {matchImageUrl ? (
                      <img
                        src={matchImageUrl}
                        alt={m.fullName || "Profile"}
                        className="w-16 h-16 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border">
                        <UserCircle className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {m.fullName || "Unnamed"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {m.ukCity || "-"}
                      </div>
                    </div>
                    <Link
                      href={`/admin/profile/${m._id}`}
                      className="text-pink-600 hover:text-pink-800 font-semibold text-xs flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400">No matches found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
