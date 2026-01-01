"use client";
import { OnboardingWizard } from "@/components/profile/OnboardingWizard";

/**
 * Onboarding route - shows the multi-step profile setup wizard
 */
export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-base-light to-secondary/5">
      <div className="container mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-neutral-dark mb-2">Welcome to Aroosi</h1>
          <p className="text-neutral-light max-w-lg mx-auto">
            Let's get your profile set up so you can start meeting amazing people.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
