"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import {
  fetchUserProfileImages,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProfileFormStepImages from "@/components/profile/ProfileFormStepImages";
import type { ImageType } from "@/types/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/profile";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EditProfileImagesPage() {
  const { token } = useAuthContext();
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>(
    {
      queryKey: ["profile", token],
      queryFn: async () => {
        if (!token) return null;
        const res = await getCurrentUserWithProfile(token);
        if (!res.success || !res.data) return null;
        // unwrap

        const envelope: any = (res.data as any).profile
          ? (res.data as any).profile
          : res.data;
        return envelope as Profile;
      },
      enabled: !!token,
    }
  );

  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageType[]>(
    {
      queryKey: ["profileImages", token, profile?._id],
      queryFn: async () => {
        if (!token || !profile?._id) return [];
        const result = await fetchUserProfileImages(token, profile._id);
        console.log("[fetchUserProfileImages] raw response", result);
        if (!result.success || !result.data) return [];
        /* unwrap */

        const payload: any = Array.isArray(result.data)
          ? result.data
          : (result.data as any).images;

        const mapped = (payload || []).map((img: any) => ({
          id: img.id || img._id || img.storageId || "",
          url: img.url,
          _id: img._id,
          storageId: img.storageId,
          name: img.name || img.fileName,
          size: img.size,
          uploadedAt: img.uploadedAt,
        })) as ImageType[];

        console.log("[fetchUserProfileImages] mapped images", mapped);
        return mapped;
      },
      enabled: !!token && !!profile?.userId,
    }
  );

  if (profileLoading || imagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-light">
        <LoadingSpinner size={32} colorClassName="text-pink-600" />
        <span className="ml-3 text-pink-700 font-semibold">Loading...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-light text-center">
        <p className="text-lg font-medium mb-4">Profile not found.</p>
        <Button onClick={() => router.push("/profile")}>Back to Profile</Button>
      </div>
    );
  }
  console.log(images);
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-light p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Edit Profile Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileFormStepImages
            images={images}
            isLoading={imagesLoading}
            profileId={profile._id}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={() => router.push("/profile")}>Done</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
