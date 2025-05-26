"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";

export default function CreateProfilePage() {
  const refetchKey = 0;
  const createProfile = useMutation(api.users.createProfile);
  const currentUserProfile = useQuery(api.users.getCurrentUserWithProfile, {});
  const router = useRouter();

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.profile) {
      console.log("currentUserProfile", currentUserProfile);
      router.replace("/search");
    }
  }, [currentUserProfile, router]);

  // If loading, show spinner
  if (currentUserProfile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  // If user already has a profile, redirect to /search
  if (currentUserProfile && currentUserProfile.profile) {
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
          initialValues={currentUserProfile?.profile ?? {}}
          onSubmit={async (values) => {
            // Ensure preferredGender is one of the allowed values
            const allowedGenders = ["male", "female", "other", "any"] as const;
            let preferredGender:
              | "male"
              | "female"
              | "other"
              | "any"
              | undefined = undefined;
            if (
              allowedGenders.includes(
                values.preferredGender as unknown as (typeof allowedGenders)[number]
              )
            ) {
              preferredGender =
                values.preferredGender as (typeof allowedGenders)[number];
            }
            // Ensure maritalStatus is one of the allowed values
            const allowedMaritalStatuses = [
              "single",
              "divorced",
              "widowed",
              "annulled",
            ] as const;
            let maritalStatus:
              | "single"
              | "divorced"
              | "widowed"
              | "annulled"
              | undefined = undefined;
            if (
              allowedMaritalStatuses.includes(
                values.maritalStatus as unknown as (typeof allowedMaritalStatuses)[number]
              )
            ) {
              maritalStatus =
                values.maritalStatus as (typeof allowedMaritalStatuses)[number];
            }
            // Ensure diet is one of the allowed values
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
                values.diet as unknown as (typeof allowedDiets)[number]
              )
            ) {
              diet = values.diet as (typeof allowedDiets)[number];
            }
            // Ensure smoking is one of the allowed values
            const allowedSmoking = ["no", "occasionally", "yes"] as const;
            let smoking: (typeof allowedSmoking)[number] | undefined =
              undefined;
            if (
              allowedSmoking.includes(
                values.smoking as unknown as (typeof allowedSmoking)[number]
              )
            ) {
              smoking = values.smoking as (typeof allowedSmoking)[number];
            }
            // Ensure drinking is one of the allowed values
            const allowedDrinking = ["no", "occasionally", "yes"] as const;
            let drinking: (typeof allowedDrinking)[number] | undefined =
              undefined;
            if (
              allowedDrinking.includes(
                values.drinking as unknown as (typeof allowedDrinking)[number]
              )
            ) {
              drinking = values.drinking as (typeof allowedDrinking)[number];
            }
            // Ensure physicalStatus is one of the allowed values
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
                values.physicalStatus as unknown as (typeof allowedPhysicalStatus)[number]
              )
            ) {
              physicalStatus =
                values.physicalStatus as (typeof allowedPhysicalStatus)[number];
            }
            // Convert profileImageIds to undefined (let the form handle it), or to Id<"_storage">[] if you have a mapping
            let profileImageIds: undefined = undefined;
            // If you have a mapping from string[] to Id<"_storage">[], you can do it here
            // Otherwise, let it be undefined so the form logic handles it
            const safeValues = {
              ...values,
              preferredGender,
              maritalStatus,
              diet,
              smoking,
              drinking,
              physicalStatus,
              profileImageIds,
            };
            // Refetch the profile before creating
            const latestProfile = await fetch(
              "/api/convex/getCurrentUserWithProfile"
            ).then((res) => res.json());
            if (latestProfile && latestProfile.profile) {
              toast.error(
                "You already have a profile. Please refresh or go to your profile page."
              );
              return;
            }
            try {
              const result = await createProfile(safeValues);
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
