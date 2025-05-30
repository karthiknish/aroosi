"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/components/TokenProvider";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";

export default function CreateProfilePage() {
  const router = useRouter();
  const token = useToken();
  const { isProfileComplete, isLoading, refetchProfile } =
    useProfileCompletion();

  // Check URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("aboutMe") || params.has("partnerPreferenceAgeMin")) {
        router.replace("/create-profile/success");
      }
    }
  }, [router]);

  // If profile is complete, redirect to search
  useEffect(() => {
    if (!isLoading && isProfileComplete) {
      console.log("Profile is complete, redirecting to search");
      setTimeout(() => {
        router.replace("/search");
      }, 50);
    }
  }, [isLoading, isProfileComplete, router]);

  if (isLoading) {
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

  // If profile is complete, don't render the form
  if (isProfileComplete) {
    return null;
  }

  return (
    <ProfileForm
      mode="create"
      onSubmit={async (values) => {
        try {
          const response = await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(values),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to create profile");
          }

          // Refetch profile completion state before redirecting
          await refetchProfile();
          router.push("/create-profile/success");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to create profile"
          );
        }
      }}
      onEditDone={() => {}}
    />
  );
}
