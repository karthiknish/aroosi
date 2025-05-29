"use client";
import { Profile } from "@/types/profile";
import Image from "next/image";
import { useToken } from "@/components/TokenProvider";
import React, { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileImage {
  _id: string;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
}

export default function ProfileView({ profile }: { profile: Profile }) {
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

  // Fetch profile images from API
  const token = useToken();
  const [images, setImages] = useState<ProfileImage[] | null | undefined>(
    undefined
  );
  useEffect(() => {
    async function fetchImages() {
      if (!profile.userId) {
        setImages([]);
        return;
      }
      try {
        if (!token) {
          setImages([]);
          return;
        }
        const res = await fetch(
          `/api/profile-detail/${profile.userId}/images`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch images");
        const data = await res.json();
        setImages(
          Array.isArray(data.userProfileImages) ? data.userProfileImages : []
        );
      } catch (e: unknown) {
        console.error(e);
        setImages(null);
      }
    }
    fetchImages();
  }, [profile.userId, token]);

  // Handle loading state
  if (images === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <Skeleton className="w-32 h-32 rounded-lg" />
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    );
  }

  // Handle error state
  if (images === null) {
    console.error("Error loading profile images: null response");
    return (
      <div className="p-4 text-red-500 text-sm">
        Error loading images. Please try again later.
      </div>
    );
  }

  // Ensure we have an array of images
  const profileImages: ProfileImage[] = Array.isArray(images)
    ? images.filter((img) => img && img._id && img.storageId)
    : [];

  // Get the first image as profile image or use placeholder
  const profileImage = profileImages.length > 0 ? profileImages[0] : null;

  // Render all profile images in order
  const imagesGrid = (profileImages || []).map((img, index) => (
    <div
      key={img._id}
      className={`relative w-20 h-20 rounded-lg overflow-hidden border mr-2 ${
        index === 0 ? "ring-2 ring-primary" : ""
      }`}
    >
      <Image
        src={img.url || ""}
        alt={profile.fullName || "Profile image"}
        fill
        className="object-cover"
        sizes="80px"
        onError={(e) => {
          // Fallback to a placeholder if image fails to load
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

  // Add placeholder if no images
  if (profileImages.length === 0) {
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
        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/20 bg-white">
          {profileImage ? (
            <Image
              src={profileImage.url || ""}
              alt={profile.fullName || "Profile image"}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder-user.jpg";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Profile details */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.fullName || "No Name"}
          </h2>
          {profile.aboutMe && (
            <p className="mt-1 text-gray-600">{profile.aboutMe}</p>
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
              {profile.gender
                ? profile.gender.charAt(0).toUpperCase() +
                  profile.gender.slice(1)
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
        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.ukCity || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.religion || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <HandHelping className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.caste || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.height || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <PersonStanding className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.maritalStatus || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.education || "-"}
            </span>
          </span>
        </div>
        <div>
          <span className="text-md text-gray-500 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.occupation || "-"}
            </span>
          </span>
        </div>

        <div>
          <span className=" text-md text-gray-500 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">
              {profile.phoneNumber || "-"}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400">
          Created: {new Date(profile.createdAt).toLocaleDateString()}
        </span>
        {profile.updatedAt && (
          <span className="text-xs text-gray-400">
            Updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </span>
        )}
        {profile.banned && (
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
