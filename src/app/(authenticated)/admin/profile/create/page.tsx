"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";
import ProfileForm from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createAdminProfile } from "@/lib/profile/adminProfileApi";

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
            setIsSubmitting(true);
            try {
              // Remove cache clearing logic for values.userId (not guaranteed to exist)
              // Invalidate related queries
              const queryClient = new QueryClient();
              await queryClient.invalidateQueries({
                queryKey: ["adminProfiles"],
              });
              // Use the adminProfileApi util for creation
              await createAdminProfile(token, {
                ...values,
                createdByAdmin: true,
                adminNotes: "Created via admin dashboard",
              });
              // Invalidate the profiles list cache
              const profilesCacheKey = "adminProfiles";
              sessionStorage.removeItem(profilesCacheKey);
              sessionStorage.removeItem(`${profilesCacheKey}_timestamp`);
              toast.success("Profile created successfully");
              router.push("/admin");
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
