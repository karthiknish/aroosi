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
import { ArrowRight, Users, Shield, Star, CalendarIcon, User, Info, CheckCircle2 } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { DatePicker } from "@/components/ui/date-picker";
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

  // Note: Auto-open modal logic removed since logged-in users are redirected away from this component

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
      <Card className="bg-base-light/80 backdrop-blur-xl shadow-2xl border-0 overflow-hidden relative ring-1 ring-black/5">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x" />
        
        <div className="sm:p-8 p-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-neutral-dark mb-2 tracking-tight">
              Find Your Match
            </h2>
            <p className="text-neutral-light text-sm font-sans">
              Join thousands of Afghan singles finding love
            </p>
          </div>

          {/* Modern Progress Indicator */}
          <div className="flex justify-center mb-10 relative">
            <div className="flex items-center justify-between w-full max-w-[240px] relative">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative z-10 flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: i === step ? 1.1 : 1,
                      backgroundColor: i <= step ? "var(--primary)" : "var(--base-light)",
                      borderColor: i <= step ? "var(--primary)" : "rgba(0,0,0,0.1)",
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 shadow-sm",
                      i <= step ? "text-white shadow-primary/20" : "text-neutral-light"
                    )}
                  >
                    {i < step ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span>{i}</span>
                    )}
                  </motion.div>
                  <span className={cn(
                    "absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                    i <= step ? "text-primary" : "text-neutral-light/50"
                  )}>
                    {i === 1 ? "Basic" : i === 2 ? "Details" : "Contact"}
                  </span>
                </div>
              ))}
              
              {/* Background Line */}
              <div className="absolute top-5 left-0 w-full h-[2px] bg-neutral/5 -z-0 rounded-full" />
              
              {/* Active Progress Line */}
              <div className="absolute top-5 left-0 w-full h-[2px] -z-0 overflow-hidden rounded-full">
                <motion.div 
                  className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                  initial={{ width: "0%" }}
                  animate={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="min-h-[300px]"
            >
              {/* Step 1: Profile For & Gender */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-neutral-dark font-semibold text-sm block font-sans flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
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
                        className="w-full h-14 bg-neutral/5 border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl text-base"
                      >
                        <SelectValue placeholder="Select who this is for" />
                      </SelectTrigger>
                      <SelectContent className="bg-base-light/95 backdrop-blur-xl border-neutral/10 shadow-2xl rounded-2xl p-1">
                        <SelectItem value="self" className="rounded-xl py-3">Myself</SelectItem>
                        <SelectItem value="friend" className="rounded-xl py-3">A Friend</SelectItem>
                        <SelectItem value="family" className="rounded-xl py-3">A Family Member</SelectItem>
                      </SelectContent>
                    </Select>
                    {heroErrors.profileFor && (
                      <p className="text-xs text-danger font-medium animate-shake">
                        {heroErrors.profileFor}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-neutral-dark font-semibold text-sm block font-sans">
                      {required("Gender")}
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "male", label: "Male", icon: "♂️" },
                        { id: "female", label: "Female", icon: "♀️" }
                      ].map((g) => (
                        <Button
                          key={g.id}
                          type="button"
                          variant="outline"
                          onClick={() => handleInputChange("gender", g.id)}
                          className={cn(
                            "relative h-20 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 font-bold font-sans overflow-hidden group",
                            (heroData.gender ?? "") === g.id
                              ? "border-primary bg-primary/5 text-primary shadow-md"
                              : "border-neutral/5 bg-neutral/5 text-neutral-light hover:border-neutral/20 hover:bg-neutral/10"
                          )}
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{g.icon}</span>
                          <span className="text-sm">{g.label}</span>
                          {(heroData.gender ?? "") === g.id && (
                            <motion.div
                              layoutId="gender-active-bg"
                              className="absolute inset-0 bg-primary/5 -z-10"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </Button>
                      ))}
                    </div>
                    {heroErrors.gender && (
                      <p className="text-xs text-danger font-medium animate-shake">
                        {heroErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Name & Date of Birth */}
              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <ValidatedInput
                      label="Full Name"
                      field="fullName"
                      step={1}
                      value={heroData.fullName ?? ""}
                      onValueChange={(val) => handleInputChange("fullName", val)}
                      placeholder="e.g. Sarah Ahmad"
                      required
                      externalError={heroErrors.fullName}
                      className="h-14 bg-neutral/5 border-neutral/10 focus:ring-2 focus:ring-primary/20 rounded-2xl font-sans text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-neutral-dark font-semibold text-sm block font-sans">
                      {required("Date of Birth")}
                    </Label>
                    <DatePicker
                      date={
                        heroData.dateOfBirth
                          ? new Date(heroData.dateOfBirth)
                          : undefined
                      }
                      setDate={(date) => {
                        if (!date || isNaN(date.getTime())) return;
                        handleInputChange(
                          "dateOfBirth",
                          format(date, "yyyy-MM-dd")
                        );
                      }}
                      minDate={new Date("1900-01-01")}
                      maxDate={
                        new Date(
                          new Date().getFullYear() - 18,
                          new Date().getMonth(),
                          new Date().getDate()
                        )
                      }
                      error={!!heroErrors.dateOfBirth}
                      className="h-14 bg-neutral/5 border-neutral/10 hover:bg-neutral/10 transition-all rounded-2xl text-base"
                    />
                    {heroErrors.dateOfBirth && (
                      <p className="text-xs text-danger font-medium animate-shake">
                        {heroErrors.dateOfBirth}
                      </p>
                    )}
                    <p className="text-[11px] text-neutral-light/70 flex items-center gap-1.5 px-1">
                      <Info className="w-3 h-3" />
                      You must be at least 18 years old to join.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Phone Number */}
              {step === 3 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-neutral-dark font-semibold text-sm block font-sans">
                      {required("Phone Number")}
                    </Label>
                    <div className={cn(
                      "transition-all duration-300 rounded-2xl border-2 overflow-hidden",
                      heroErrors.phoneNumber 
                        ? "border-danger ring-4 ring-danger/10" 
                        : "border-neutral/5 bg-neutral/5 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50"
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
                        className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-14 px-4"
                      />
                    </div>
                    {heroErrors.phoneNumber && (
                      <p className="text-xs text-danger font-medium animate-shake">
                        {heroErrors.phoneNumber}
                      </p>
                    )}
                    
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-2">
                      <p className="text-xs text-primary font-bold flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        Privacy First
                      </p>
                      <p className="text-xs text-neutral-light leading-relaxed">
                        We use your number for account security and verification. Your number is never shared with other members without your permission.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between items-center pt-8 border-t border-neutral/10">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="text-neutral-light hover:text-neutral-dark hover:bg-neutral/5 rounded-xl font-bold px-6"
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
                "bg-primary hover:bg-primary-dark text-white shadow-xl shadow-primary/20 transition-all duration-300 rounded-2xl font-bold h-12",
                step === 3 ? "px-10" : "px-8"
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
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-neutral-light font-sans">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-primary hover:text-primary-dark font-bold hover:underline transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </Card>

      {/* Trust indicators */}
      <div className="mt-10 grid grid-cols-3 gap-4">
        {[
          { icon: Shield, text: "100% Verified", sub: "Safe & Secure" },
          { icon: Users, text: "1000+ Members", sub: "Afghan Singles" },
          { icon: Star, text: "Success Stories", sub: "Real Matches" },
        ].map(({ icon: Icon, text, sub }, idx) => (
          <motion.div 
            key={text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + idx * 0.1 }}
            className="text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <p className="text-xs font-bold text-white mb-0.5">{text}</p>
            <p className="text-[10px] text-white/60 font-medium">{sub}</p>
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
