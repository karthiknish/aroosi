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
        className="max-w-2xl w-full p-0 overflow-hidden bg-white/95 backdrop-blur-xl shadow-2xl border-0 sm:rounded-2xl ring-1 ring-black/5"
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
        <div className="relative flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh]">
          {isSubmitting && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
              <div
                className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"
                aria-label="Submitting profile"
              />
              <p className="text-sm font-medium text-primary animate-pulse">
                {hasSubmittedProfile
                  ? "Finalizing your profile..."
                  : "Submitting..."}
              </p>
            </div>
          )}
          
          {/* Header with Progress */}
          <div className="relative bg-white/50 backdrop-blur-md border-b border-gray-100 p-6 pb-6 z-10">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-pink-500 to-primary bg-[length:200%_100%] animate-gradient-x"
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

            <div className="mt-2">
              <DialogTitle id="profile-modal-title" className="text-2xl font-bold text-gray-900 tracking-tight">
                {step === 7 ? "Create Account" : "Complete Your Profile"}
              </DialogTitle>
              <div className="flex items-center justify-between mt-1">
                <p id="profile-modal-desc" className="text-gray-500 text-sm">
                  {step < 5 ? "Tell us a bit more about yourself" : "Almost there!"}
                </p>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  Step {step} of {totalSteps}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="min-h-[300px]"
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
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center z-10">
            {step > 2 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={false}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

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
                className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25 transition-all duration-300 px-8"
              >
                {stepValidation.isValidating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validating...
                  </span>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
