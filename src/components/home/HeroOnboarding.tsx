"use client";

import React, { useState, useEffect } from "react";
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
import { showErrorToast } from "@/lib/ui/toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ProfileCreationModal } from "@/components/home/ProfileCreationModal";
import { PhoneInput } from "@/components/ui/phone-input";
import * as z from "zod";
import {
  ProfileWizardProvider,
  useProfileWizard,
} from "@/contexts/ProfileWizardContext";
import {
  enhancedValidationSchemas,
} from "@/lib/validation/profileValidation";
import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";
import RequiredLabel from "../ui/RequiredLabel";

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

const onboardingStepSchemas = [heroStep1Schema, heroStep2Schema, heroStep3Schema];

function HeroOnboardingInner() {
  const { step, setStep, formData, updateFormData } = useProfileWizard();

  const heroData = formData as unknown as OnboardingData;
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
      window.localStorage.setItem(STORAGE_KEYS.HERO_ONBOARDING, JSON.stringify(snapshot));
    } catch {}
  };

  const validateOnboardingStep = (): boolean => {
    const schema = onboardingStepSchemas[step - 1];
    const res = schema.safeParse(heroData);
    if (!res.success) {
      showErrorToast(
        null,
        res.error.errors[0]?.message || "Please fill in all fields",
      );
      return false;
    }
    return true;
  };

  const handleNext = () => {
    // Defensive normalization: on step 3, ensure we store canonical E.164-like phone before validation
    if (step === 3) {
      const cleaned = String(heroData.phoneNumber ?? "").replace(/[^\d+]/g, "");
      const digits = cleaned.replace(/\D/g, "");
      const normalized = digits.length >= 10 && digits.length <= 15 ? `+${digits}` : String(heroData.phoneNumber ?? "");
      if (normalized !== heroData.phoneNumber) {
        updateFormData({ phoneNumber: normalized });
      }
    }

    // Delegate validation (including 18+ age) to the shared schema wrappers
    if (!validateOnboardingStep()) return;

    if (step < 3) {
      setStep(step + 1);
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
        showErrorToast(null, "Please complete all required fields first.");
        return;
      }
      // Open the profile creation modal with the collected data
      setShowProfileModal(true);
      try {
        if (typeof window !== "undefined") {
          // Fire-and-forget signal for belt-and-braces clearing listeners
          window.postMessage({ type: "onboarding-opened" }, window.location.origin);
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
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 max-h-[80vh] overflow-y-auto sm:max-h-none sm:overflow-visible">
        <div className="sm:p-8 p-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Find Your Perfect Match
            </h2>
            <p className="text-gray-600">
              Join thousands of Afghan singles finding love
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      i <= step
                        ? "bg-pink-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-12 h-1 transition-colors ${
                        i < step ? "bg-pink-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Profile For & Gender */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="profileFor"
                      className="text-gray-700 mb-2 block"
                    >
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
                        className="w-full bg-white"
                      >
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent
                        className="bg-white border border-gray-200 z-[100]"
                        style={{ backgroundColor: "white" }}
                      >
                        <SelectItem
                          value="self"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Myself
                        </SelectItem>
                        <SelectItem
                          value="son"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Son
                        </SelectItem>
                        <SelectItem
                          value="daughter"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Daughter
                        </SelectItem>
                        <SelectItem
                          value="brother"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Brother
                        </SelectItem>
                        <SelectItem
                          value="sister"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Sister
                        </SelectItem>
                        <SelectItem
                          value="friend"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Friend
                        </SelectItem>
                        <SelectItem
                          value="relative"
                          className="hover:bg-gray-50 focus:bg-gray-100"
                        >
                          Relative
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">
                      {required("Gender")}
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={
                          (heroData.gender ?? "") === "male"
                            ? "default"
                            : "outline"
                        }
                        className={`w-full ${
                          (heroData.gender ?? "") === "male"
                            ? "bg-pink-600 hover:bg-pink-700"
                            : ""
                        }`}
                        onClick={() => handleInputChange("gender", "male")}
                      >
                        Male
                      </Button>
                      <Button
                        type="button"
                        variant={
                          (heroData.gender ?? "") === "female"
                            ? "default"
                            : "outline"
                        }
                        className={`w-full ${
                          (heroData.gender ?? "") === "female"
                            ? "bg-pink-600 hover:bg-pink-700"
                            : ""
                        }`}
                        onClick={() => handleInputChange("gender", "female")}
                      >
                        Female
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Name & Date of Birth */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="fullName"
                      className="text-gray-700 mb-2 block"
                    >
                      {required("Full Name")}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter full name"
                      value={heroData.fullName ?? ""}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                      className="w-full bg-white"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="dateOfBirth"
                      className="text-gray-700 mb-2 block"
                    >
                      {required("Date of Birth")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white",
                            !heroData.dateOfBirth && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {heroData.dateOfBirth ? (
                            format(new Date(heroData.dateOfBirth), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-white"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={
                            heroData.dateOfBirth
                              ? new Date(heroData.dateOfBirth)
                              : undefined
                          }
                          onSelect={(date) => {
                            // Guard against invalid dates before writing to state
                            if (!date || isNaN(date.getTime())) {
                              showErrorToast(null, "Please select a valid date.");
                              return;
                            }
                            handleInputChange(
                              "dateOfBirth",
                              format(date, "yyyy-MM-dd"),
                            );
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            const minDate = new Date(
                              today.getFullYear() - 18,
                              today.getMonth(),
                              today.getDate(),
                            );
                            return (
                              date > minDate || date < new Date("1900-01-01")
                            );
                          }}
                          captionLayout="dropdown"
                          defaultMonth={new Date(2000, 0, 1)}
                        />
                      </PopoverContent>
                    </Popover>
                    {/* Optional friendly message without duplicating validation logic */}
                    {heroData.dateOfBirth && (
                      <p className="text-sm text-gray-500 mt-1">
                        Date selected: {format(new Date(heroData.dateOfBirth), "PPP")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Phone Number */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="phoneNumber"
                      className="text-gray-700 mb-2 block"
                    >
                      {required("Phone Number")}
                    </Label>
                    <PhoneInput
                      value={heroData.phoneNumber ?? ""}
                      onChange={(value: string) => {
                        // Strip spaces and normalize to "+<digits>" for storage in context
                        const cleaned = value.replace(/[^\d+]/g, "");
                        const digits = cleaned.replace(/\D/g, "");
                        const normalized = digits.length >= 10 && digits.length <= 15 ? `+${digits}` : value;
                        handleInputChange("phoneNumber", normalized);
                      }}
                      placeholder="7XXX XXXXXX"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className={`${
                step === 1 ? "w-full" : "ml-auto"
              } bg-pink-600 hover:bg-pink-700 text-white`}
            >
              {loading ? (
                "Please wait..."
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

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </Card>

      {/* Trust indicators */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div className="text-white">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm opacity-90">100% Verified</p>
        </div>
        <div className="text-white">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm opacity-90">1000+ Members</p>
        </div>
        <div className="text-white">
          <Star className="h-8 w-8 mx-auto mb-2 opacity-80" />
          <p className="text-sm opacity-90">Success Stories</p>
        </div>
      </div>

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
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
