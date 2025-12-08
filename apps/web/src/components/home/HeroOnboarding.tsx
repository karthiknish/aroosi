"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import Link from "next/link";
import { ArrowRight, Users, Shield, Star, CalendarIcon } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { ProfileCreationModal } from "@/components/home/ProfileCreationModal";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ProfileWizardProvider,
  useProfileWizard,
} from "@/contexts/ProfileWizardContext";
import {
  enhancedValidationSchemas,
} from "@/lib/validation/profileValidation";
import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import RequiredLabel from "../ui/RequiredLabel";
import { useAuth } from "@/hooks/useAuth";
import { isOnboardingEssentialComplete } from "@/lib/userProfile/calculations";

interface OnboardingData {
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
}

/**
 * Thin wrappers that reuse enhancedValidationSchemas.basicInfo to eliminate drift.
 * We validate the subset of fields collected in each hero step.
 */
const heroStep1Schema = enhancedValidationSchemas.basicInfo.pick({
  profileFor: true,
  gender: true,
});
const heroStep2Schema = enhancedValidationSchemas.basicInfo.pick({
  fullName: true,
  dateOfBirth: true,
});
const heroStep3Schema = enhancedValidationSchemas.basicInfo.pick({
  phoneNumber: true,
});

const onboardingStepSchemas = [
  heroStep1Schema,
  heroStep2Schema,
  heroStep3Schema,
];

function HeroOnboardingInner() {
  const { formData, updateFormData } = useProfileWizard();
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();
  const [step, setStep] = useState<number>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(STORAGE_KEYS.HERO_ONBOARDING);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<OnboardingData>;
          const haveStep1 = Boolean(parsed.profileFor && parsed.gender);
          const haveStep2 = Boolean(parsed.fullName && parsed.dateOfBirth);
          if (!haveStep1) return 1;
          if (!haveStep2) return 2;
          return 3;
        }
      }
    } catch {}
    const haveStep1 = Boolean(
      (formData.profileFor as string) && (formData.gender as string)
    );
    const haveStep2 = Boolean(
      (formData.fullName as string) && (formData.dateOfBirth as string)
    );
    if (!haveStep1) return 1;
    if (!haveStep2) return 2;
    return 3;
  });

  const heroData = formData as unknown as OnboardingData;
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [heroErrors, setHeroErrors] = useState<Record<string, string>>({});

  // Auto-open modal if authenticated but profile incomplete
  React.useEffect(() => {
    if (isAuthenticated && profile && !isOnboardingEssentialComplete(profile)) {
      setShowProfileModal(true);
    }
  }, [isAuthenticated, profile]);

  const fieldLabels: Record<keyof OnboardingData, string> = {
    profileFor: "This profile is for",
    gender: "Gender",
    fullName: "Full Name",
    dateOfBirth: "Date of Birth",
    phoneNumber: "Phone Number",
  };

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    updateFormData({ [field]: value });
    // Persist HERO_ONBOARDING snapshot for symmetry; modal will clear on success/close
    try {
      if (typeof window === "undefined") return;
      const snapshot: Partial<OnboardingData> = {
        profileFor: (formData.profileFor as string) ?? "",
        gender: (formData.gender as string) ?? "",
        fullName: (formData.fullName as string) ?? "",
        dateOfBirth: (formData.dateOfBirth as string) ?? "",
        phoneNumber: (formData.phoneNumber as string) ?? "",
        [field]: value,
      };
      window.localStorage.setItem(
        STORAGE_KEYS.HERO_ONBOARDING,
        JSON.stringify(snapshot)
      );
    } catch {}
  };

  // Persist partial onboarding to Firestore for authenticated users (idempotent merge)
  const persistPartialToFirestore = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return; // Not signed in yet; defer until sign in
      const ref = doc(db, "users", user.uid);
      // Merge minimal onboarding fields without overwriting later profile fields
      await setDoc(
        ref,
        {
          // basic identity
          id: user.uid,
          email: user.email ?? null,
          onboardingPartial: {
            profileFor: heroData.profileFor || null,
            gender: heroData.gender || null,
            fullName: heroData.fullName || null,
            dateOfBirth: heroData.dateOfBirth || null,
            phoneNumber: heroData.phoneNumber || null,
            step,
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      // Non-fatal; surfaces only in dev console
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("HeroOnboarding partial persist failed", e);
      }
    }
  };

  const validateOnboardingStep = (): boolean => {
    const schema = onboardingStepSchemas[step - 1];
    const res = schema.safeParse(heroData);
    if (res.success) {
      setHeroErrors({});
      return true;
    }
    // Build errors map for inline feedback and toast message with field name
    const nextErrors: Record<string, string> = {};
    const firstIssue = res.error.errors[0];
    res.error.errors.forEach((e) => {
      const key = String(e.path?.[0] || "");
      if (key && !nextErrors[key]) nextErrors[key] = e.message;
    });
    setHeroErrors(nextErrors);

    const firstKey = String(firstIssue?.path?.[0] || "");
    const label = (fieldLabels as any)[firstKey] || firstKey || "Field";
    const message = firstIssue?.message || "Please fill in this field";
    showErrorToast(null, `${label}: ${message}`);
    // Focus the first invalid field if possible
    try {
      const focusId =
        firstKey === "gender"
          ? "gender-male"
          : firstKey === "profileFor"
            ? "profileFor"
            : firstKey;
      const el = document.getElementById(focusId);
      if (el) (el as HTMLElement).focus();
    } catch {}
    return false;
  };

  const handleNext = () => {
    // Defensive normalization: on step 3, ensure we store canonical E.164-like phone before validation
    if (step === 3) {
      const cleaned = String(heroData.phoneNumber ?? "").replace(/[^\d+]/g, "");
      const digits = cleaned.replace(/\D/g, "");
      const normalized =
        digits.length >= 10 && digits.length <= 15
          ? `+${digits}`
          : String(heroData.phoneNumber ?? "");
      if (normalized !== heroData.phoneNumber) {
        updateFormData({ phoneNumber: normalized });
      }
    }

    // Delegate validation (including 18+ age) to the shared schema wrappers
    if (!validateOnboardingStep()) return;

    if (step < 3) {
      setStep((s) => {
        const next = s + 1;
        void persistPartialToFirestore();
        return next;
      });
    } else {
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Gate opening modal on unified required set to match modal’s hasBasicData
      const required: (keyof OnboardingData)[] = [
        "profileFor",
        "gender",
        "fullName",
        "dateOfBirth",
        "phoneNumber",
      ];
      const missing = required.filter(
        (k) => !heroData[k] || String(heroData[k] ?? "").trim() === ""
      );
      if (missing.length > 0) {
        const pretty = missing
          .map((k) => fieldLabels[k])
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        const more = missing.length > 3 ? " and more" : "";
        showErrorToast(null, `Missing: ${pretty}${more}.`);
        return;
      }
      // If user already authenticated, persist partial immediately (non-blocking)
      try {
        await persistPartialToFirestore();
      } catch {}
      // Always open modal; Step7 handles sign up / sign in if needed
      setShowProfileModal(true);
      showSuccessToast("Great! Let’s complete your profile.");
      try {
        if (typeof window !== "undefined") {
          // Fire-and-forget signal for belt-and-braces clearing listeners
          window.postMessage(
            { type: "onboarding-opened" },
            window.location.origin
          );
        }
      } catch {}
    } catch {
      showErrorToast(null, "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Use shared RequiredLabel component
  const required = (label: string) => <RequiredLabel>{label}</RequiredLabel>;

  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      <Card className="bg-white/95 backdrop-blur-xl shadow-2xl border-0 overflow-hidden relative ring-1 ring-white/20">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-pink-500 to-primary animate-gradient-x" />
        
        <div className="sm:p-8 p-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Find Your Match
            </h2>
            <p className="text-gray-500 text-sm">
              Join thousands of Afghan singles finding love
            </p>
          </div>

          {/* Modern Progress Indicator */}
          <div className="flex justify-center mb-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 rounded-full" />
            <div className="flex items-center justify-between w-full max-w-[200px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative group">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
                      i <= step
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110"
                        : "bg-white border-gray-200 text-gray-400"
                    )}
                  >
                    {i}
                  </div>
                </div>
              ))}
            </div>
             {/* Active Progress Line */}
             <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[200px] h-0.5 -z-20 bg-gray-100 overflow-hidden rounded-full"
             >
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
             </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-h-[280px]"
            >
              {/* Step 1: Profile For & Gender */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium block">
                      {required("This profile is for")}
                    </Label>
                    <Select
                      value={heroData.profileFor ?? ""}
                      onValueChange={(value: string) =>
                        handleInputChange("profileFor", value)
                      }
                    >
                      <SelectTrigger
                        id="profileFor"
                        className="w-full h-12 bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <SelectValue placeholder="Select who this is for" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-100 shadow-xl">
                        <SelectItem value="self">Myself</SelectItem>
                        <SelectItem value="friend">A Friend</SelectItem>
                        <SelectItem value="family">A Family Member</SelectItem>
                      </SelectContent>
                    </Select>
                    {heroErrors.profileFor && (
                      <p className="text-xs text-red-500 font-medium animate-shake">
                        {heroErrors.profileFor}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium block">
                      {required("Gender")}
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      {["male", "female"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleInputChange("gender", g)}
                          className={cn(
                            "relative h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-medium capitalize",
                            (heroData.gender ?? "") === g
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-gray-100 bg-gray-50/50 text-gray-600 hover:border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          {g}
                          {(heroData.gender ?? "") === g && (
                            <motion.div
                              layoutId="gender-check"
                              className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    {heroErrors.gender && (
                      <p className="text-xs text-red-500 font-medium animate-shake">
                        {heroErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Name & Date of Birth */}
              {step === 2 && (
                <div className="space-y-6">
                  <ValidatedInput
                    label="Full Name"
                    field="fullName"
                    step={1}
                    value={heroData.fullName ?? ""}
                    onValueChange={(val) => handleInputChange("fullName", val)}
                    placeholder="e.g. Sarah Ahmad"
                    required
                    externalError={heroErrors.fullName}
                    className="h-12 bg-gray-50/50 border-gray-200 focus:ring-2 focus:ring-primary/20"
                  />

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium block">
                      {required("Date of Birth")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal bg-gray-50/50 border-gray-200 hover:bg-gray-100 transition-all",
                            !heroData.dateOfBirth && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {heroData.dateOfBirth ? (
                            format(new Date(heroData.dateOfBirth), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border-gray-100 shadow-xl rounded-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            heroData.dateOfBirth
                              ? new Date(heroData.dateOfBirth)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (!date || isNaN(date.getTime())) return;
                            handleInputChange(
                              "dateOfBirth",
                              format(date, "yyyy-MM-dd")
                            );
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            const minDate = new Date(
                              today.getFullYear() - 18,
                              today.getMonth(),
                              today.getDate()
                            );
                            return (
                              date > minDate || date < new Date("1900-01-01")
                            );
                          }}
                          captionLayout="dropdown"
                          defaultMonth={new Date(2000, 0, 1)}
                          className="rounded-xl"
                        />
                      </PopoverContent>
                    </Popover>
                    {heroErrors.dateOfBirth && (
                      <p className="text-xs text-red-500 font-medium animate-shake">
                        {heroErrors.dateOfBirth}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Phone Number */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium block">
                      {required("Phone Number")}
                    </Label>
                    <div className={cn(
                      "transition-all duration-200 rounded-lg border",
                      heroErrors.phoneNumber 
                        ? "border-red-500 ring-1 ring-red-500/20" 
                        : "border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
                    )}>
                      <PhoneInput
                        value={heroData.phoneNumber ?? ""}
                        onChange={(value: string) => {
                          const cleaned = value.replace(/[^\d+]/g, "");
                          const digits = cleaned.replace(/\D/g, "");
                          const normalized =
                            digits.length >= 10 && digits.length <= 15
                              ? `+${digits}`
                              : value;
                          handleInputChange("phoneNumber", normalized);
                        }}
                        placeholder="7XXX XXXXXX"
                        className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg"
                      />
                    </div>
                    {heroErrors.phoneNumber && (
                      <p className="text-xs text-red-500 font-medium animate-shake">
                        {heroErrors.phoneNumber}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      We'll send you a verification code to confirm your number.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                Back
              </Button>
            ) : (
              <div /> 
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className={cn(
                "bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25 transition-all duration-300",
                step === 3 ? "px-8" : "px-6"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : step === 3 ? (
                "Create Profile"
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-primary hover:text-primary-dark font-semibold hover:underline transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </Card>

      {/* Trust indicators */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {[
          { icon: Shield, text: "100% Verified" },
          { icon: Users, text: "1000+ Members" },
          { icon: Star, text: "Success Stories" },
        ].map(({ icon: Icon, text }, idx) => (
          <motion.div 
            key={text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.1 }}
            className="text-white/90 backdrop-blur-sm bg-white/10 rounded-xl p-3 border border-white/10"
          >
            <Icon className="h-6 w-6 mx-auto mb-2 opacity-90" />
            <p className="text-xs font-medium">{text}</p>
          </motion.div>
        ))}
      </div>

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialData={heroData as unknown as Partial<Record<string, unknown>>}
      />
    </div>
  );
}

export function HeroOnboarding() {
  return (
    <ProfileWizardProvider>
      <HeroOnboardingInner />
    </ProfileWizardProvider>
  );
}
