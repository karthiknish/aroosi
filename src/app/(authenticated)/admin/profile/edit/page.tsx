"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";
import ProfileForm from "@/components/profile/ProfileForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchAdminProfiles, updateAdminProfile } from "@/lib/profile/adminProfileApi";

export default function AdminEditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { token, isLoaded: authIsLoaded, isSignedIn, isAdmin } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin or not loaded yet
  useEffect(() => {
    if (authIsLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [authIsLoaded, isSignedIn, isAdmin, router]);

  // Fetch the profile by id
  const { data: profile, isLoading } = useQuery({
    queryKey: ["adminProfile", id, token],
    queryFn: async () => {
      if (!id || !token) return null;
      // Use fetchAdminProfiles with search param as id
      const result = await fetchAdminProfiles(token, id, 1);
      if (result && Array.isArray(result.profiles)) {
        return result.profiles.find((p) => p._id === id || p.userId === id) || null;
      }
      return null;
    },
    enabled: !!id && !!token,
  });

  if (!authIsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded shadow max-w-xl mx-auto text-center">
          <strong>Error:</strong> Profile not found.
        </div>
      </div>
    );
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
          mode="edit"
          initialValues={profile}
          onSubmit={async (values) => {
            if (isSubmitting || !id) return;
            setIsSubmitting(true);
            try {
              // Invalidate related queries
              const queryClient = new QueryClient();
              await queryClient.invalidateQueries({ queryKey: ["adminProfiles"] });
              await updateAdminProfile(token!, id, values);
              // Invalidate the profiles list cache
              const profilesCacheKey = "adminProfiles";
              sessionStorage.removeItem(profilesCacheKey);
              sessionStorage.removeItem(`${profilesCacheKey}_timestamp`);
              toast.success("Profile updated successfully");
              router.push("/admin");
            } catch (error) {
              console.error("Profile update error:", error);
              toast.error(
                error instanceof Error
                  ? error.message || "Failed to update profile"
                  : "An unexpected error occurred"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
          onEditDone={() => router.back()}
          submitButtonText={isSubmitting ? "Saving..." : "Save Changes"}
        />
      </div>
    </div>
  );
}
