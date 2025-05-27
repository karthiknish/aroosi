"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";

export default function CreateProfilePage() {
  const refetchKey = 0;
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<any | undefined>(
    undefined
  );

  useEffect(() => {
    async function fetchProfile() {
      const token = await getToken();
      if (!token) {
        setCurrentUserProfile(null);
        return;
      }
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserProfile(data.profile ? data : { profile: null });
      } else {
        setCurrentUserProfile({ profile: null });
      }
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => {
    if (currentUserProfile && currentUserProfile.profile) {
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
            const allowedGenders = ["male", "female", "other", "any"] as const;
            let preferredGender:
              | "male"
              | "female"
              | "other"
              | "any"
              | undefined = undefined;
            if (allowedGenders.includes(values.preferredGender as any)) {
              preferredGender = values.preferredGender as any;
            }
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
            if (allowedMaritalStatuses.includes(values.maritalStatus as any)) {
              maritalStatus = values.maritalStatus as any;
            }
            const allowedDiets = [
              "vegetarian",
              "non-vegetarian",
              "vegan",
              "eggetarian",
              "other",
            ] as const;
            let diet: (typeof allowedDiets)[number] | undefined = undefined;
            if (allowedDiets.includes(values.diet as any)) {
              diet = values.diet as any;
            }
            const allowedSmoking = ["no", "occasionally", "yes"] as const;
            let smoking: (typeof allowedSmoking)[number] | undefined =
              undefined;
            if (allowedSmoking.includes(values.smoking as any)) {
              smoking = values.smoking as any;
            }
            const allowedDrinking = ["no", "occasionally", "yes"] as const;
            let drinking: (typeof allowedDrinking)[number] | undefined =
              undefined;
            if (allowedDrinking.includes(values.drinking as any)) {
              drinking = values.drinking as any;
            }
            const allowedPhysicalStatus = [
              "normal",
              "differently-abled",
              "other",
            ] as const;
            let physicalStatus:
              | (typeof allowedPhysicalStatus)[number]
              | undefined = undefined;
            if (allowedPhysicalStatus.includes(values.physicalStatus as any)) {
              physicalStatus = values.physicalStatus as any;
            }
            const profileImageIds: undefined = undefined;
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
            const token = await getToken();
            if (!token) {
              toast.error("You must be signed in to create a profile.");
              return;
            }
            // Refetch the profile before creating
            const latestProfileRes = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const latestProfile = latestProfileRes.ok
              ? await latestProfileRes.json()
              : null;
            if (latestProfile && latestProfile.profile) {
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
