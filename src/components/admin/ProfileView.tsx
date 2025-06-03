"use client";
import { Profile } from "@/types/profile";
import Image from "next/image";
import React, { useState } from "react";
import {
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  BadgeCheck,
  Cake,
  Users,
  HeartHandshake,
  HandHelping,
  Ruler,
  Phone,
  PersonStanding,
} from "lucide-react";

interface ProfileImage {
  _id: string;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
}

interface ProfileViewProps {
  profiledata: Profile;
  images: ProfileImage[] | null | undefined;
  imageUrls?: string[];
}

export default function ProfileView({
  profiledata,
  images,
  imageUrls = [],
}: ProfileViewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Safely handle undefined profile with default values
  const safeProfile =
    profiledata ||
    ({
      dateOfBirth: "",
      // Add other required properties with default values as needed
    } as Profile);

  // Calculate age from dateOfBirth if possible
  let age: string | number = "-";
  if (profiledata.dateOfBirth) {
    const dob = new Date(profiledata.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        years--;
      }
      age = years;
    }
  }

  // Handle missing or invalid profile
  if (!safeProfile) {
    return (
      <div className="p-4 text-red-500 text-sm">
        Error: Profile information is missing or invalid.
      </div>
    );
  }

  // Handle error state for images
  if (images === null) {
    return (
      <div className="p-4 text-red-500 text-sm">
        Error loading images. Please try again later.
      </div>
    );
  }

  // Use imageUrls if provided, otherwise fallback to images prop
  let displayImages: { url: string }[] = [];
  if (imageUrls && imageUrls.length > 0) {
    displayImages = imageUrls.map((url) => ({ url }));
  } else if (Array.isArray(images)) {
    displayImages = images
      .filter((img) => img && img.url)
      .map((img) => ({ url: img.url! }));
  }

  // Loading state for main profile image
  const profileImage = displayImages.length > 0 ? displayImages[0] : null;

  // If there is a profile image, wait for it to load before rendering the rest
  if (profileImage && !imageLoaded && !imageError) {
    return (
      <div className="w-full max-w-2xl p-6 border rounded-lg shadow-sm bg-white flex flex-col items-center justify-center min-h-[300px]">
        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/20 bg-white relative flex items-center justify-center">
          {profileImage ? (
            <>
              <img
                src={profileImage.url}
                alt={profiledata.fullName || "Profile image"}
                width={128}
                height={128}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  setImageError(true);
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder-user.jpg";
                }}
              />
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-600" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
        <div className="mt-4 text-gray-400">Loading profile image...</div>
      </div>
    );
  }

  const imagesGrid = displayImages.map((img, index) => (
    <div
      key={img.url}
      className={`relative w-20 h-20 rounded-lg overflow-hidden border mr-2 ${
        index === 0 ? "ring-2 ring-primary" : ""
      }`}
    >
      <Image
        src={img.url}
        alt={profiledata.fullName || "Profile image"}
        fill
        className="object-cover"
        sizes="80px"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = "/placeholder-user.jpg";
        }}
      />
      {index === 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
          Profile
        </div>
      )}
    </div>
  ));
  if (displayImages.length === 0) {
    imagesGrid.push(
      <div
        key="placeholder"
        className="relative w-20 h-20 rounded-lg overflow-hidden border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400"
      >
        <span>No Image</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl p-6 border rounded-lg shadow-sm bg-white">
      {/* Profile image and details row */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Profile image */}
        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/20 bg-white relative flex items-center justify-center">
          {profileImage ? (
            <>
              <img
                src={profileImage.url}
                alt={profile?.fullName || "Profile image"}
                width={128}
                height={128}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  setImageError(true);
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder-user.jpg";
                }}
              />
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-600" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
        {/* Profile details */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {profiledata.fullName || "No Name"}
          </h2>
          {profiledata.aboutMe && (
            <p className="mt-1 text-gray-600">{profiledata.aboutMe}</p>
          )}
        </div>
      </div>
      {/* Images grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Profile Photos</h3>
        <div className="flex flex-wrap gap-2">{imagesGrid}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 mt-2 gap-x-8 gap-y-3">
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gray-400" />

            <span className="font-medium text-gray-700">
              {profiledata.gender
                ? profiledata.gender.charAt(0).toUpperCase() +
                  profiledata.gender.slice(1)
                : "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <Cake className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{age}</span>
          </span>
        </div>
        {profiledata.dateOfBirth && (
          <div>
            <span className="text-md text-gray-500 flex items-center gap-1">
              <Cake className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-700">
                {new Date(profiledata.dateOfBirth).toLocaleDateString()}
              </span>
            </span>
          </div>
        )}
        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.ukCity || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.religion || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <HandHelping className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.caste || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.height || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <PersonStanding className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.maritalStatus || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.education || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.occupation || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profiledata.phoneNumber || "-"}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400">
          Created: {new Date(profiledata.createdAt).toLocaleDateString()}
        </span>
        {profiledata.updatedAt && (
          <span className="text-xs text-gray-400">
            Updated: {new Date(profiledata.updatedAt).toLocaleDateString()}
          </span>
        )}
        {profiledata.banned && (
          <span className="text-xs text-red-500 font-semibold ml-2">
            BANNED
          </span>
        )}
      </div>
    </div>
  );
}

export function ProfileMinifiedView({ profile }: { profile: Profile }) {
  // Calculate age from dateOfBirth if possible
  let age: string | number = "-";
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        years--;
      }
      age = years;
    }
  }
  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg bg-white shadow-sm">
      {/* Gender icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
        {profile.gender === "male" && (
          <Users className="w-5 h-5 text-blue-500" />
        )}
        {profile.gender === "female" && (
          <Users className="w-5 h-5 text-pink-500" />
        )}
        {profile.gender === "other" && (
          <Users className="w-5 h-5 text-gray-400" />
        )}
        {!profile.gender && <Users className="w-5 h-5 text-gray-300" />}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 items-center">
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          {profile.ukCity || "-"}
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <Cake className="w-4 h-4 text-gray-400" />
          {age}
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-xs">
          <Briefcase className="w-4 h-4 text-gray-400" />
          {profile.occupation || "-"}
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-xs">
          <GraduationCap className="w-4 h-4 text-gray-400" />
          {profile.education || "-"}
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-xs">
          <Heart className="w-4 h-4 text-pink-400" />
          {profile.religion || "-"}
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-xs">
          <BadgeCheck className="w-4 h-4 text-green-400" />
          {profile.maritalStatus || "-"}
        </div>
      </div>
    </div>
  );
}
