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
  if (!profile || typeof profile !== "object") return { profileFor: "self" };
  const p = profile as Record<string, unknown>;
  return {
    profileFor: "self",
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
    <div className="min-h-screen w-full bg-base-light flex items-center justify-center relative overflow-x-hidden py-12">
      {/* Decorative color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")`,
        }}
      ></div>
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Create Your Profile
            </h1>
            {/* Pink wavy SVG underline */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-xl p-8">
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
