"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import ProfileCreateWizard from "@/components/profile/ProfileCreateWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";
import type { Profile, ProfileFormValues } from "@aroosi/shared/types";

export default function AdminCreateProfilePage() {
  const router = useRouter();
  const {
    isLoaded: authIsLoaded,
    isSignedIn,
    isAdmin,
  } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin or not loaded yet
  useEffect(() => {
    if (authIsLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [authIsLoaded, isSignedIn, isAdmin, router]);

  // Show loading state while checking auth
  if (!authIsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in or not admin, show nothing (will be redirected)
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Management
          </Button>
          <h1 className="text-xl font-bold text-neutral-900">Create New Profile</h1>
      </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <ProfileCreateWizard
            onSubmit={async (values) => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              // Ensure dateOfBirth is a string
              const submitValues: Partial<ProfileFormValues> = {
                ...values,
                dateOfBirth: values.dateOfBirth,
                partnerPreferenceCity: Array.isArray(
                  values.partnerPreferenceCity
                )
                  ? values.partnerPreferenceCity
                  : typeof values.partnerPreferenceCity === "string"
                    ? values.partnerPreferenceCity
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [],
              };
              const createdProfile = await adminProfilesAPI.create({
                ...(submitValues as Partial<Profile>),
                userId:
                  typeof values.userId === "string" && values.userId.trim()
                    ? values.userId.trim()
                    : undefined,
              });

              if (createdProfile?._id) {
                handleApiOutcome({
                  success: true,
                  message: "Profile created successfully",
                });
                router.push(`/admin/profile/${createdProfile._id}`);
              } else {
                handleApiOutcome({
                  success: false,
                  error: "Profile was created but no profile ID was returned",
                });
              }
            } catch (error) {
              handleError(
                error,
                { scope: "AdminCreateProfilePage", action: "create_profile" },
                { customUserMessage: "Failed to create profile" }
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
          loading={isSubmitting}
        />
      </div>
    </div>
  );
}
