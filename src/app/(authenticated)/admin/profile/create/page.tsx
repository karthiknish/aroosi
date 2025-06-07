"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/components/AuthProvider";
import ProfileForm from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { submitProfile } from "@/lib/profile/userProfileApi";

// Extend the ProfileForm props to include submitButtonText
declare module "@/components/profile/ProfileForm" {
  interface ProfileFormProps {
    submitButtonText?: string | React.ReactNode;
  }
}

export default function AdminCreateProfilePage() {
  const router = useRouter();
  const {
    token,
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
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // If not signed in or not admin, show nothing (will be redirected)
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile Management
          </Button>
        </div>
        <ProfileForm
          mode="create"
          onSubmit={async (values) => {
            if (isSubmitting) return;
            if (!token) return;
            setIsSubmitting(true);
            try {
              // Ensure dateOfBirth is a string
              const submitValues: Partial<
                import("@/types/profile").ProfileFormValues
              > = {
                ...values,
                dateOfBirth:
                  typeof values.dateOfBirth === "string"
                    ? values.dateOfBirth
                    : values.dateOfBirth instanceof Date
                      ? values.dateOfBirth.toISOString()
                      : "",
                // Only keep partnerPreferenceUkCity logic
                partnerPreferenceUkCity: Array.isArray(
                  values.partnerPreferenceUkCity
                )
                  ? values.partnerPreferenceUkCity
                  : typeof values.partnerPreferenceUkCity === "string"
                    ? values.partnerPreferenceUkCity
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [],
              };
              // Remove profileImageIds if present
              const { ...restValues } = submitValues;
              const response = await submitProfile(token, restValues, "create");
              if (response.success) {
                toast.success("Profile created successfully");
                router.push("/admin");
              } else {
                toast.error(response.error || "Failed to create profile");
              }
            } catch (error) {
              console.error("Profile creation error:", error);
              toast.error(
                error instanceof Error
                  ? error.message || "Failed to create profile"
                  : "An unexpected error occurred"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
          onEditDone={() => router.back()}
          submitButtonText={isSubmitting ? "Creating..." : "Create Profile"}
        />
      </div>
    </div>
  );
}
