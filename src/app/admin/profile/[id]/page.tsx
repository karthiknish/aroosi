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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import React, { useState } from "react";

export default function AdminProfileDetailPage() {
  // All hooks must be called unconditionally at the top
  const { id } = useParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const profile = useQuery(api.users.getProfileById, {
    id: id as Id<"profiles">,
  });
  // We must always call this hook, so pass a dummy userId if profile is not loaded
  const images = useQuery(
    api.images.getProfileImages,
    profile && profile.userId
      ? { userId: profile.userId as Id<"users"> }
      : "skip"
  );
  const matches = useQuery(api.users.getMatchesForProfile, {
    profileId: id as Id<"profiles">,
  });
  const imageMap =
    images && Array.isArray(images)
      ? Object.fromEntries(images.map((img) => [String(img.storageId), img]))
      : {};
  const orderedImages =
    profile && profile.profileImageIds && images
      ? profile.profileImageIds
          .map((id) => imageMap[String(id)])
          .filter(Boolean)
      : [];
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const handlePrev = () => {
    setCurrentImageIdx((prev) =>
      prev === 0 ? orderedImages.length - 1 : prev - 1
    );
  };
  const handleNext = () => {
    setCurrentImageIdx((prev) =>
      prev === orderedImages.length - 1 ? 0 : prev + 1
    );
  };

  // Debug logs
  console.log({
    userId: profile?.userId,
    images,
    profileImageIds: profile?.profileImageIds,
    orderedImages,
  });

  // Now do early returns for loading/auth
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

  return (
    <div className="max-w-3xl mx-auto py-10 px-2">
      {/* Profile Images Slider Section */}
      {orderedImages.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64 flex items-center justify-center">
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-pink-100 transition"
                  aria-label="Previous image"
                  type="button"
                  disabled={orderedImages.length <= 1}
                  style={{
                    opacity: orderedImages.length <= 1 ? 0.5 : 1,
                    pointerEvents: orderedImages.length <= 1 ? "none" : "auto",
                  }}
                >
                  <ChevronLeft className="w-6 h-6 text-pink-600" />
                </button>
                <img
                  src={
                    orderedImages[currentImageIdx].url ||
                    `/api/storage/${orderedImages[currentImageIdx].storageId}`
                  }
                  alt={`Profile image ${currentImageIdx + 1}`}
                  className="object-cover rounded-lg w-64 h-64 border-2 border-gray-200 shadow"
                  style={{ maxWidth: 256, maxHeight: 256 }}
                />
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-pink-100 transition"
                  aria-label="Next image"
                  type="button"
                  disabled={orderedImages.length <= 1}
                  style={{
                    opacity: orderedImages.length <= 1 ? 0.5 : 1,
                    pointerEvents: orderedImages.length <= 1 ? "none" : "auto",
                  }}
                >
                  <ChevronRight className="w-6 h-6 text-pink-600" />
                </button>
                <div className="absolute bottom-2 right-2 bg-white/80 text-xs px-2 py-0.5 rounded shadow">
                  {currentImageIdx + 1} / {orderedImages.length}
                </div>
              </div>
              {orderedImages.length > 1 && (
                <div className="flex gap-2 mt-4">
                  {orderedImages.map((img, idx) => (
                    <button
                      key={img.storageId}
                      className={`w-3 h-3 rounded-full border-2 ${
                        idx === currentImageIdx
                          ? "bg-pink-600 border-pink-600"
                          : "bg-gray-200 border-gray-300"
                      }`}
                      onClick={() => setCurrentImageIdx(idx)}
                      aria-label={`Go to image ${idx + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Fallback: show all images if orderedImages is empty but images exist */}
      {orderedImages.length === 0 &&
        Array.isArray(images) &&
        images.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>All Images (Unordered)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {images.map((img, idx) => (
                  <img
                    key={img.storageId}
                    src={img.url || `/api/storage/${img.storageId}`}
                    alt={`Image ${idx + 1}`}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid #eee",
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      <Card className="mb-8 shadow-xl">
        <CardContent className="pt-8 pb-10 px-6 flex flex-col items-center">
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
