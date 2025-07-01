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
import { useAuthContext } from "@/components/AuthProvider";

interface OnboardingData {
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
}

const onboardingSchema = z.object({
  profileFor: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  fullName: z.string().min(2, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  phoneNumber: z
    .string()
    .regex(/^\+\d{1,4}\s?\d{6,14}$/i, "Enter a valid phone number"),
});

const onboardingStepSchemas = [
  onboardingSchema.pick({ profileFor: true, gender: true }),
  onboardingSchema.pick({ fullName: true, dateOfBirth: true }),
  onboardingSchema.pick({ phoneNumber: true }),
];

export function HeroOnboarding() {
  const { isSignedIn } = useAuthContext();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    profileFor: "",
    gender: "",
    fullName: "",
    dateOfBirth: "",
    phoneNumber: "",
  });

  // ---------- LocalStorage persistence ----------
  const STORAGE_KEY = "heroOnboardingState";

  // Restore on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        step?: number;
        formData?: Partial<OnboardingData & Record<string, unknown>>;
      };
      if (parsed.formData) {
        setFormData((prev) => ({ ...prev, ...parsed.formData }));
      }
      if (parsed.step && parsed.step >= 1 && parsed.step <= 3) {
        setStep(parsed.step);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save when formData or step changes, but pause while the modal is open to avoid clobbering its updates
  useEffect(() => {
    if (showProfileModal) return; // modal takes ownership of persistence
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, formData }));
    } catch {
      /* ignore */
    }
  }, [formData, step, showProfileModal]);

  if (isSignedIn) {
    return null;
  }

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateOnboardingStep = (): boolean => {
    const schema = onboardingStepSchemas[step - 1];
    const res = schema.safeParse(formData);
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
    if (!validateOnboardingStep()) return;
    if (step === 2) {
      const age = calculateAge(formData.dateOfBirth);
      if (isNaN(age) || age < 18) {
        showErrorToast(
          null,
          "You must be at least 18 years old to use this app.",
        );
        return;
      }
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Open the profile creation modal with the collected data
      setShowProfileModal(true);
      // Note: localStorage will be cleared by ProfileCreationModal after migration
    } catch {
      showErrorToast(null, "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

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
                      This profile is for
                    </Label>
                    <Select
                      value={formData.profileFor}
                      onValueChange={(value) =>
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
                    <Label className="text-gray-700 mb-2 block">Gender</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={
                          formData.gender === "male" ? "default" : "outline"
                        }
                        className={`w-full ${
                          formData.gender === "male"
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
                          formData.gender === "female" ? "default" : "outline"
                        }
                        className={`w-full ${
                          formData.gender === "female"
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
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter full name"
                      value={formData.fullName}
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
                      Date of Birth
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white",
                            !formData.dateOfBirth && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dateOfBirth ? (
                            format(new Date(formData.dateOfBirth), "PPP")
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
                            formData.dateOfBirth
                              ? new Date(formData.dateOfBirth)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              handleInputChange(
                                "dateOfBirth",
                                format(date, "yyyy-MM-dd"),
                              );
                            }
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
                    {formData.dateOfBirth && (
                      <p className="text-sm text-gray-500 mt-1">
                        Age: {calculateAge(formData.dateOfBirth)} years
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
                      Phone Number
                    </Label>
                    <PhoneInput
                      value={formData.phoneNumber}
                      onChange={(value) =>
                        handleInputChange("phoneNumber", value)
                      }
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
        initialData={formData}
      />
    </div>
  );
}
