"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileFormValues } from "@/components/profile/ProfileForm";
import { useToken } from "@/components/TokenProvider";

export default function CreateProfilePage() {
  const refetchKey = 0;
  const router = useRouter();
  const token = useToken();
  const [currentUserProfile, setCurrentUserProfile] = useState<
    Record<string, unknown> | null | undefined
  >(undefined);

  useEffect(() => {
    async function fetchProfile() {
      if (!token) {
        setCurrentUserProfile(null);
        return;
      }
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserProfile(data && data.userId ? data : { profile: null });
      } else {
        setCurrentUserProfile({ profile: null });
      }
    }
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.userId) {
      router.replace("/search");
    }
  }, [currentUserProfile, router]);

  if (currentUserProfile === undefined) {
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

  if (currentUserProfile && currentUserProfile.userId) {
    if (typeof window !== "undefined") {
      router.replace("/search");
    }
    return null;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white p-4 pt-24 sm:pt-28 md:pt-32">
      <main className="w-full max-w-2xl space-y-8 bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
          <Link
            href="/"
            className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
          >
            Aroosi
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800">
            Create Your Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tell us a bit about yourself to get started. The more you share, the
            better your matches!
          </p>
        </div>
        <ProfileForm
          key={refetchKey}
          mode="create"
          initialValues={
            (currentUserProfile?.profile as ProfileFormValues) ?? {}
          }
          onSubmit={async (values: ProfileFormValues) => {
            const allowedGenders = ["male", "female", "other", "any"] as const;
            let preferredGender:
              | "male"
              | "female"
              | "other"
              | "any"
              | undefined = undefined;
            if (
              allowedGenders.includes(
                values.preferredGender as (typeof allowedGenders)[number]
              )
            ) {
              preferredGender =
                values.preferredGender as (typeof allowedGenders)[number];
            }
            const allowedMaritalStatuses = [
              "single",
              "divorced",
              "widowed",
              "annulled",
            ] as const;
            let maritalStatus:
              | (typeof allowedMaritalStatuses)[number]
              | undefined = undefined;
            if (
              allowedMaritalStatuses.includes(
                values.maritalStatus as (typeof allowedMaritalStatuses)[number]
              )
            ) {
              maritalStatus =
                values.maritalStatus as (typeof allowedMaritalStatuses)[number];
            }
            const allowedDiets = [
              "vegetarian",
              "non-vegetarian",
              "vegan",
              "eggetarian",
              "other",
            ] as const;
            let diet: (typeof allowedDiets)[number] | undefined = undefined;
            if (
              allowedDiets.includes(
                values.diet as (typeof allowedDiets)[number]
              )
            ) {
              diet = values.diet as (typeof allowedDiets)[number];
            }
            const allowedSmoking = ["no", "occasionally", "yes"] as const;
            let smoking: (typeof allowedSmoking)[number] | undefined =
              undefined;
            if (
              allowedSmoking.includes(
                values.smoking as (typeof allowedSmoking)[number]
              )
            ) {
              smoking = values.smoking as (typeof allowedSmoking)[number];
            }
            const allowedDrinking = ["no", "occasionally", "yes"] as const;
            let drinking: (typeof allowedDrinking)[number] | undefined =
              undefined;
            if (
              allowedDrinking.includes(
                values.drinking as (typeof allowedDrinking)[number]
              )
            ) {
              drinking = values.drinking as (typeof allowedDrinking)[number];
            }
            const allowedPhysicalStatus = [
              "normal",
              "differently-abled",
              "other",
            ] as const;
            let physicalStatus:
              | (typeof allowedPhysicalStatus)[number]
              | undefined = undefined;
            if (
              allowedPhysicalStatus.includes(
                values.physicalStatus as (typeof allowedPhysicalStatus)[number]
              )
            ) {
              physicalStatus =
                values.physicalStatus as (typeof allowedPhysicalStatus)[number];
            }
            const profileImageIds: undefined = undefined;
            const safeValues: ProfileFormValues = {
              ...values,
              preferredGender,
              maritalStatus,
              diet,
              smoking,
              drinking,
              physicalStatus,
              profileImageIds,
            };
            const latestProfileRes = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const latestProfile = latestProfileRes.ok
              ? await latestProfileRes.json()
              : null;
            if (latestProfile && latestProfile.userId) {
              toast.error(
                "You already have a profile. Please refresh or go to your profile page."
              );
              return;
            }
            try {
              const res = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(safeValues),
              });
              const result = await res.json();
              if (!result?.success) {
                toast.error(
                  result?.message ||
                    "Could not create profile. Please try again."
                );
                return;
              }
              router.replace("/create-profile/success");
            } catch (err: unknown) {
              console.error("Error in create-profile page:", err);
              toast.error("Could not create profile. Please try again.");
            }
          }}
        />
      </main>
    </div>
  );
}
