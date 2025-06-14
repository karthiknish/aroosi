"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import type { ProfileFormValues } from "@/components/profile/ProfileForm";
import { useRouter } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { submitProfile } from "@/lib/profile/userProfileApi";

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

  // Extract profileId generated at sign-up (same for create & edit flows)
  const profileId = (profile as { id?: string } | null)?.id || "";

  // Memoize initialValues with a stable dependency
  const initialValues = useMemo(
    () => mapProfileToInitialValues(profile),
    [profile]
  );

  // Create a stable form key based on the user ID to ensure proper remounting
  const formKey = useMemo(
    () => `create-profile-${profileId || "new"}`,
    [profileId]
  );

  const [isSaving, setIsSaving] = useState(false);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: ProfileFormValues) => {
      if (isSaving) return; // duplicate guard

      if (!token) {
        showErrorToast(
          null,
          "Authentication token is missing. Please sign in again."
        );
        return;
      }

      // Basic age ≥ 18 check
      try {
        const dob = new Date(values.dateOfBirth);
        const ageMs = Date.now() - dob.getTime();
        const age = new Date(ageMs).getUTCFullYear() - 1970;
        if (isNaN(age) || age < 18) {
          showErrorToast(
            null,
            "You must be at least 18 years old to create a profile."
          );
          return;
        }
      } catch {
        showErrorToast(null, "Please provide a valid date of birth.");
        return;
      }

      setIsSaving(true);

      const attemptSubmit = async () => {
        try {
          const apiResult = await submitProfile(token, values, "create");

          if (!apiResult.success) {
            // token expired?
            if (
              apiResult.error?.includes("Unauthorized") ||
              apiResult.error?.includes("401")
            ) {
              showErrorToast(null, "Session expired. Please sign in again.");
              return;
            }
            throw new Error(apiResult.error || "Failed to create profile");
          }

          await refreshProfile();
          showSuccessToast(
            "Profile created successfully! You can now browse matches."
          );
          router.push("/dashboard");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create profile";
          // Display the error using the standard helper (no action options supported)
          showErrorToast(errorMessage);
        } finally {
          setIsSaving(false);
        }
      };

      await attemptSubmit();
    },
    [isSaving, token, router, refreshProfile]
  );

  // Unsaved changes prompt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSaving) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaving]);

  // Render the profile form for new profiles, pre-filling with context profile if available
  return (
    <div className="w-full bg-base-light flex items-center justify-center relative overflow-x-hidden py-12">
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
            profileId={profileId}
            userId={userId}
            onSubmit={handleSubmit}
            onEditDone={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
