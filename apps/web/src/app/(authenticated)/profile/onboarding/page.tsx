"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Onboarding route - redirects to profile edit page
 * This route exists to provide a clear onboarding entry point for users
 * who haven't completed their profile yet.
 */
export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile edit page where they can complete their profile
    router.replace("/profile/edit");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-light">
      <div className="text-center">
        <LoadingSpinner size={32} colorClassName="text-primary" />
        <p className="mt-4 text-neutral-light">Setting up your profile...</p>
      </div>
    </div>
  );
}
