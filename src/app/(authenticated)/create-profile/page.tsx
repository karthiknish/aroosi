"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EnhancedProfileWizard from "@/components/profile/EnhancedProfileWizard";
import type { ProfileFormValues } from "@/types/profile";
import { submitProfile } from "@/lib/profile/userProfileApi";
import { useAuthContext } from "@/components/AuthProvider";
import { showErrorToast } from "@/lib/ui/toast";

export default function CreateEnhancedProfilePage() {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Partial<ProfileFormValues>>({});
  const router = useRouter();
  const { token } = useAuthContext();

  // Load onboarding data from localStorage if available
  useEffect(() => {
    const pendingData = localStorage.getItem("pendingProfileData");
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData);
        setInitialData({
          fullName: data.fullName || "",
          dateOfBirth: data.dateOfBirth || "",
          gender: data.gender || "",
          phoneNumber: data.phoneNumber || "",
          profileFor: data.profileFor || "self",
        });
        
        // Clear the pending data after loading
        localStorage.removeItem("pendingProfileData");
      } catch (error) {
        console.error("Error parsing pending profile data:", error);
      }
    }
  }, []);

  const handleSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    setServerError(null);

    try {
      if (!token) {
        showErrorToast("You must be signed in to create a profile.");
        setLoading(false);
        return;
      }
      const result = await submitProfile(
        token,
        { ...values, subscriptionPlan: "free" },
        "create"
      );
      if (result.success) {
        router.push("/create-profile/success");
      } else {
        setServerError(
          result.error || "Failed to create profile. Please try again."
        );
        showErrorToast(result.error || "Failed to create profile");
      }
    } catch {
      setServerError("Failed to create profile. Please try again.");
      showErrorToast("Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <EnhancedProfileWizard
        initialValues={initialData}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        profileId="demo-profile-id"
      />
    </div>
  );
} 