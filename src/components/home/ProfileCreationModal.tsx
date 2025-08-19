"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Step1Basic } from "./steps/Step1Basic";
import { Step2LocationPhysical } from "./steps/Step2LocationPhysical";
import { Step3CulturalLifestyle } from "./steps/Step3CulturalLifestyle";
import { Step4EducationCareer } from "./steps/Step4EducationCareer";
import { Step5PartnerPreferences } from "./steps/Step5PartnerPreferences";
import { Step6Photos } from "./steps/Step6Photos";
import { Step7AccountCreation } from "./steps/Step7AccountCreation";
import { COUNTRIES } from "@/lib/constants/countries";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useProfileCreationController } from "./profileCreation/controller";
import { useFirebaseAuth as useAuth } from "@/components/FirebaseAuthProvider";
import { getGlobalRequiredFields } from "./profileCreation/step7";

const countries: string[] = COUNTRIES.map((c) => c.name).sort();

type ProfileCreationData = Record<string, unknown>;

interface ProfileCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ProfileCreationData>;
}

export function ProfileCreationModal({
  isOpen,
  onClose,
  initialData,
}: ProfileCreationModalProps) {
  const router = useRouter();
  const {
    step,
    setStep,
    totalSteps,
    formData,
    hasBasicData,
    errors,
    stepValidation,
    preferredCitiesInput,
    setPreferredCitiesInput,
    pendingImages,
    setPendingImages,
    userId,
    handleClose,
    handleNext,
    handleBack,
    handleInputChange,
    handleProfileImagesChange,
    isSubmitting,
    hasSubmittedProfile,
  } = useProfileCreationController({ isOpen, onClose, initialData, router });

  const required = (label: string) => (
    <span>
      {label} <span className="text-red-500">*</span>
    </span>
  );

  const { isAuthenticated } = useAuth();
  React.useEffect(() => {
    // Removed full page reload on auth-success to preserve pendingImages (local-only before signup).
    // Auth provider context should react to sign-in and controller effect will finalize profile.
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if ((event as any).data?.type === "auth-success") {
        // No reload; allow in-memory wizard state (including pendingImages) to remain.
        // Optionally could trigger a lightweight profile refresh via custom event.
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && step === 7) {
      // note: controller handles submission side-effects
    }
  }, [isAuthenticated, step]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-y-scroll bg-white sm:max-h-[90vh] max-h-screen sm:rounded-lg rounded-none "
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        aria-describedby="profile-modal-desc"
      >
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
              <div
                className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"
                aria-label="Submitting profile"
              />
              <p className="text-sm font-medium text-pink-700">
                {hasSubmittedProfile
                  ? "Finalizing your profile..."
                  : "Submitting..."}
              </p>
            </div>
          )}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-pink-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          <DialogHeader className="p-6 pb-0">
            <DialogTitle id="profile-modal-title" className="sr-only">
              Profile creation
            </DialogTitle>
            <DialogTitle
              aria-hidden="true"
              className="text-2xl font-bold text-gray-900"
            >
              Find Your Perfect Match
            </DialogTitle>
            {step < 5 && (
              <p id="profile-modal-desc" className="text-gray-600 mt-2">
                Join thousands of Afghan singles finding love
              </p>
            )}
          </DialogHeader>

          <div className="p-6 ">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && !hasBasicData && (
                  <Step1Basic
                    formData={formData as any}
                    requiredLabel={required}
                    onChange={handleInputChange as any}
                  />
                )}

                {step === 2 && (
                  <Step2LocationPhysical
                    formData={formData as any}
                    errors={errors}
                    step={step}
                    requiredLabel={required}
                    onChange={handleInputChange as any}
                    stepValidation={stepValidation as any}
                    countries={countries}
                  />
                )}

                {step === 3 && (
                  <Step3CulturalLifestyle
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                    stepValidation={stepValidation as any}
                  />
                )}

                {step === 4 && (
                  <Step4EducationCareer
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                  />
                )}

                {step === 5 && (
                  <Step5PartnerPreferences
                    formData={formData as any}
                    step={step}
                    onChange={handleInputChange as any}
                    preferredCitiesInput={preferredCitiesInput}
                    setPreferredCitiesInput={setPreferredCitiesInput}
                  />
                )}

                {step === 6 && (
                  <Step6Photos
                    userId={userId || ""}
                    pendingImages={pendingImages as any}
                    setPendingImages={setPendingImages as any}
                    onImagesChanged={handleProfileImagesChange as any}
                  />
                )}

                {step === 7 && (
                  <Step7AccountCreation
                    formData={formData as any}
                    setStep={setStep}
                    router={router as any}
                    onComplete={() => {
                      try {
                        showSuccessToast(
                          "Account created. Finalizing your profile..."
                        );
                      } catch {}
                    }}
                    onError={(msg?: string) => {
                      const m =
                        typeof msg === "string" && msg.trim().length > 0
                          ? msg
                          : "Sign up failed";
                      showErrorToast(m);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between items-center">
              {step > 2 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={false}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {(step === 1 || step === 2) && <div />}

              {step >= 1 && step < 7 && (
                <Button
                  onClick={async () => {
                    if (step === 2) {
                      const precheckMissing =
                        !(formData as any).city ||
                        String((formData as any).city).trim() === "" ||
                        !(formData as any).height ||
                        String((formData as any).height).trim() === "" ||
                        !(formData as any).maritalStatus ||
                        String((formData as any).maritalStatus).trim() === "";
                      if (precheckMissing) {
                        showErrorToast(
                          null,
                          "Please complete location and physical details"
                        );
                        await handleNext();
                        return;
                      }
                    }
                    await handleNext();
                  }}
                  disabled={stepValidation.isValidating}
                  className="bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {stepValidation.isValidating ? "Validating..." : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
