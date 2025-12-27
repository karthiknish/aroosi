"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import ProfileCreateWizard from "@/components/profile/ProfileCreateWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { submitProfile } from "@/lib/profile/userProfileApi";

export default function AdminCreateProfilePage() {
  const router = useRouter();
  const {
    isLoaded: authIsLoaded,
    isSignedIn,
    isAdmin,
    user, // firebase user object
    userId: currentUserId,
  } = useAuthContext() as any;
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
    <div className="min-h-screen bg-neutral-50 pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
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
              const submitValues: Partial<
                import("@aroosi/shared/types").ProfileFormValues
              > = {
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
              const { ...restValues } = submitValues;
              // Cookie-auth: server reads HttpOnly cookies
              // Admin-created profile: use a generated userId or require one in values
              // Expect values.userId or fallback to user.uid
              const targetUserId =
                (values as any).userId ||
                currentUserId ||
                user?.uid ||
                user?.id;
              const response = await submitProfile(
                targetUserId,
                restValues,
                "create"
              );
              if (response.success) {
                showSuccessToast("Profile created successfully");
                router.push("/admin");
              } else {
                showErrorToast(response.error, "Failed to create profile");
              }
            } catch (error) {
              console.error("Profile creation error:", error);
              showErrorToast(error, "Failed to create profile");
            } finally {
              setIsSubmitting(false);
            }
          }}
          loading={isSubmitting}
        />
      </div>
    </div>
  </div>
  );
}
