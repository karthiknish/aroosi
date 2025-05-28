"use client";

import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileForm, {
  ProfileFormValues,
} from "@/components/profile/ProfileForm";
import ProfileView from "@/components/profile/ProfileView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import React, { useState, useEffect } from "react";
import { Id } from "@convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/types/profile";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const [profileData, setProfileData] = useState<Profile | undefined>(
    undefined
  );
  const [userConvexData, setUserConvexData] = useState<
    Record<string, unknown> | undefined
  >(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch profile data from API
  useEffect(() => {
    async function fetchProfile() {
      if (!isSignedIn) {
        setProfileData(undefined);
        setUserConvexData(undefined);
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      try {
        const token = await getToken({ template: "convex" });
        const res = await fetch("/api/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-User-Id": clerkUser?.id ?? "",
          },
        });
        const data = await res.json();
        console.log("data", data);

        setUserConvexData(data);
        setProfileData(data ? toProfileType(data) : undefined);
      } catch {
        setProfileData(undefined);
        setUserConvexData(undefined);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isEditing, showSuccessModal]);

  // Determine if onboarding (profile is incomplete or doesn't exist yet)
  const isOnboarding = profileData === null || profileData === undefined;

  // Unified submit handler
  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    setServerError(null);
    try {
      const allowedFields = [
        "fullName",
        "dateOfBirth",
        "gender",
        "ukCity",
        "ukPostcode",
        "religion",
        "caste",
        "motherTongue",
        "height",
        "maritalStatus",
        "education",
        "occupation",
        "annualIncome",
        "aboutMe",
        "partnerPreferenceAgeMin",
        "partnerPreferenceAgeMax",
        "partnerPreferenceReligion",
        "partnerPreferenceUkCity",
        "preferredGender",
        "profileImageIds",
        "phoneNumber",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ];
      const filtered = Object.fromEntries(
        Object.entries(values).filter(([key]) => allowedFields.includes(key))
      );
      const token = await getToken({ template: "convex" });
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filtered),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to update profile");
      }
      setIsEditing(false);
      setShowSuccessModal(true);
    } catch (error: unknown) {
      if (typeof error === "object" && error && "message" in error) {
        setServerError(
          String((error as { message?: unknown }).message) ||
            "An unexpected error occurred."
        );
      } else {
        setServerError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowSuccessModal(false); // Reset modal when entering edit mode
    setIsEditing(true);
  };

  // Handle loading and signed-out states
  if (!isSignedIn && typeof window !== "undefined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <UserCircle className="w-20 h-20 text-gray-400 mb-4" />
        <p className="text-xl text-gray-700 mb-4">
          Please sign in to manage your profile.
        </p>
        <Link href="/sign-in" passHref>
          <Button className="bg-pink-600 hover:bg-pink-700">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (loadingProfile && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  // Helper to convert profileData to Profile type
  function toProfileType(
    data: unknown
  ): import("@/types/profile").Profile | undefined {
    // If the data has a nested 'profile' field, use that
    const profileObj =
      data && typeof data === "object" && "profile" in data
        ? (data as Record<string, unknown>)["profile"]
        : data;
    if (
      !profileObj ||
      typeof profileObj !== "object" ||
      !("_id" in profileObj) ||
      !("userId" in profileObj) ||
      !("createdAt" in profileObj)
    ) {
      return undefined;
    }
    const p = profileObj as {
      _id: string | number;
      userId: string | number;
      createdAt: string | number;
      updatedAt?: string | number;
      [key: string]: unknown;
    };
    return {
      ...p,
      createdAt: p.createdAt ? String(p.createdAt) : "",
      updatedAt: p.updatedAt ? String(p.updatedAt) : undefined,
      _id: String(p._id) as Id<"profiles">,
      userId: p.userId as Id<"users">,
    };
  }

  // Conditionally render form or view
  if (isEditing || isOnboarding) {
    return (
      <ProfileForm
        mode={isOnboarding ? "create" : "edit"}
        initialValues={profileData as Partial<ProfileFormValues>}
        onSubmit={handleProfileSubmit}
        clerkUser={clerkUser ? { id: clerkUser.id } : undefined}
        loading={loading}
        serverError={serverError}
        onEditDone={() => setIsEditing(false)}
      />
    );
  }
  return (
    <>
      <ProfileView
        profileData={
          toProfileType(profileData) || {
            _id: "" as Id<"profiles">,
            userId: "" as Id<"users">,
            createdAt: "" as string,
          }
        }
        clerkUser={clerkUser ? { id: clerkUser.id } : undefined}
        userConvexData={userConvexData}
        onEdit={handleEdit}
        onDelete={() => {}}
        deleting={deleting}
      />
      {showSuccessModal && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile updated successfully!</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button
                className="bg-pink-600 hover:bg-pink-700 text-white"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
