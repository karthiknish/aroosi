"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, User, MapPin, Heart, GraduationCap, Users, Camera, ShieldCheck } from "lucide-react";
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
    <span className="font-sans">
      {label} <span className="text-danger">*</span>
    </span>
  );

  const { isAuthenticated } = useAuth();

  const stepInfo = [
    { title: "Basic Info", desc: "Let's start with the basics", icon: User },
    { title: "Location & Physical", desc: "Where are you based?", icon: MapPin },
    { title: "Lifestyle & Culture", desc: "Your values and habits", icon: Heart },
    { title: "Education & Career", desc: "Your professional background", icon: GraduationCap },
    { title: "Partner Preferences", desc: "Who are you looking for?", icon: Users },
    { title: "Photos", desc: "Add your best photos", icon: Camera },
    { title: "Create Account", desc: "Secure your profile", icon: ShieldCheck },
  ];

  const currentStepInfo = stepInfo[step - 1] || stepInfo[0];

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
        className="max-w-2xl w-full p-0 overflow-hidden bg-base-light/80 backdrop-blur-xl shadow-2xl border-0 sm:rounded-3xl ring-1 ring-neutral/5"
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
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-base-light/80 backdrop-blur-md gap-4">
              <div
                className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"
                aria-label="Submitting profile"
              />
              <p className="text-sm font-medium text-primary animate-pulse font-sans">
                {hasSubmittedProfile
                  ? "Finalizing your profile..."
                  : "Submitting..."}
              </p>
            </div>
          )}
          
          {/* Header with Progress */}
          <div className="relative bg-base-light/40 backdrop-blur-md border-b border-neutral/10 p-6 sm:p-8 z-10">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral/5">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <currentStepInfo.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-sans">
                    Step {step} of {totalSteps}
                  </span>
                </div>
                <DialogTitle id="profile-modal-title" className="text-2xl sm:text-3xl font-serif font-bold text-neutral-dark tracking-tight">
                  {currentStepInfo.title}
                </DialogTitle>
                <p id="profile-modal-desc" className="text-neutral-light text-sm sm:text-base font-sans mt-1">
                  {currentStepInfo.desc}
                </p>
              </div>
              
              <div className="hidden sm:block">
                <div className="w-16 h-16 rounded-2xl bg-neutral/5 border border-neutral/10 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
                   <span className="text-xl font-serif font-bold text-primary/40">{Math.round((step / totalSteps) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-gradient-to-b from-transparent to-neutral/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
          <div className="p-6 sm:p-8 border-t border-neutral/10 bg-base-light/80 backdrop-blur-md flex justify-between items-center z-10">
            {step > 2 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={false}
                className="flex items-center gap-2 text-neutral-light hover:text-neutral-dark hover:bg-neutral/5 rounded-2xl font-bold px-6 h-12 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
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
                className="bg-primary hover:bg-primary-dark text-white shadow-xl shadow-primary/20 transition-all duration-300 px-10 h-12 rounded-2xl font-bold"
              >
                {stepValidation.isValidating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-base-light/30 border-t-base-light rounded-full animate-spin" />
                    Validating...
                  </span>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-5 w-5" />
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
