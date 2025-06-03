"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import type { ProfileFormValues } from "@/components/profile/ProfileForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCallback, useMemo } from "react";
import { useAuthContext } from "@/components/AuthProvider";

// Helper to map context profile to ProfileForm initial values
function mapProfileToInitialValues(
  profile: unknown
): Partial<ProfileFormValues> {
  if (!profile || typeof profile !== "object") return {};
  const p = profile as Record<string, unknown>;
  return {
    fullName:
      (p.fullName as string) ||
      `${(p.firstName as string) || ""} ${(p.lastName as string) || ""}`.trim(),
    dateOfBirth: (p.dateOfBirth as string) || "",
    gender: (p.gender as ProfileFormValues["gender"]) || "other",
    height: (p.height as string) || "",
    ukCity: (p.ukCity as string) || "",
    aboutMe: (p.bio as string) || (p.aboutMe as string) || "",
    // Add more fields as needed for your form
  };
}

export default function CreateProfilePage() {
  const router = useRouter();
  const { token, refreshProfile, profile, userId } = useAuthContext();

  // Memoize initialValues with a stable dependency
  const initialValues = useMemo(
    () => mapProfileToInitialValues(profile),
    [profile]
  );

  // Create a stable form key based on the user ID to ensure proper remounting
  const formKey = useMemo(() => `create-profile-${userId || "new"}`, [userId]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: ProfileFormValues) => {
      if (!token) {
        toast.error("Authentication token is missing. Please sign in again.");
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...values, isOnboardingComplete: true }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create profile");
        }

        // Refresh profile to update the completion status
        await refreshProfile();

        // Redirect to success page - ProtectedRoute will handle further redirection
        router.push("/create-profile/success");

        return await response.json();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create profile";
        toast.error(errorMessage);
        throw error;
      }
    },
    [token, router, refreshProfile]
  );

  // Render the profile form for new profiles, pre-filling with context profile if available
  return (
    <div className="py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <ProfileForm
            key={formKey}
            mode="create"
            initialValues={initialValues}
            userId={userId}
            onSubmit={handleSubmit}
            onEditDone={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
