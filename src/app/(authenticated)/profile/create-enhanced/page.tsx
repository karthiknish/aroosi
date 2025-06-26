"use client";

import { useState } from "react";
import { toast } from "sonner";
import EnhancedProfileWizard from "@/components/profile/EnhancedProfileWizard";
import type { ProfileFormValues } from "@/types/profile";

export default function CreateEnhancedProfilePage() {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    setServerError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Profile data:", values);
      toast.success("Profile created successfully!");

      // In a real app, you would redirect to the profile page or dashboard
      // router.push("/profile");
    } catch (error) {
      console.error("Error creating profile:", error);
      setServerError("Failed to create profile. Please try again.");
      toast.error("Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <EnhancedProfileWizard
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        profileId="demo-profile-id"
      />
    </div>
  );
}
