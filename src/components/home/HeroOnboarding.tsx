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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Users, Shield, Star, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface OnboardingData {
  profileFor: string;
  gender: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
}

export function HeroOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    profileFor: "",
    gender: "",
    fullName: "",
    dateOfBirth: "",
    email: "",
    phoneNumber: "",
  });

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Basic validation
    if (step === 1 && (!formData.profileFor || !formData.gender)) {
      toast.error("Please fill in all fields");
      return;
    }
    if (step === 2 && (!formData.fullName || !formData.dateOfBirth)) {
      toast.error("Please fill in all fields");
      return;
    }
    if (step === 3 && (!formData.email || !formData.phoneNumber)) {
      toast.error("Please fill in all fields");
      return;
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
      // Store form data in localStorage for use after sign-up
      localStorage.setItem("pendingProfileData", JSON.stringify(formData));
      
      // Redirect to sign-up page
      router.push("/sign-up");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <div className="p-8">
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
                    <Label htmlFor="profileFor" className="text-gray-700 mb-2 block">
                      This profile is for
                    </Label>
                    <Select
                      value={formData.profileFor}
                      onValueChange={(value) => handleInputChange("profileFor", value)}
                    >
                      <SelectTrigger id="profileFor" className="w-full bg-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Myself</SelectItem>
                        <SelectItem value="son">Son</SelectItem>
                        <SelectItem value="daughter">Daughter</SelectItem>
                        <SelectItem value="brother">Brother</SelectItem>
                        <SelectItem value="sister">Sister</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="relative">Relative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700 mb-2 block">Gender</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={formData.gender === "male" ? "default" : "outline"}
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
                        variant={formData.gender === "female" ? "default" : "outline"}
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
                    <Label htmlFor="fullName" className="text-gray-700 mb-2 block">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter full name"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className="w-full bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth" className="text-gray-700 mb-2 block">
                      Date of Birth
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white",
                            !formData.dateOfBirth && "text-muted-foreground"
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
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleInputChange("dateOfBirth", format(date, "yyyy-MM-dd"));
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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

              {/* Step 3: Contact Information */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-gray-700 mb-2 block">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="w-full bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-gray-700 mb-2 block">
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+44 7XXX XXXXXX"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      className="w-full bg-white"
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
            <Link href="/sign-in" className="text-pink-600 hover:text-pink-700 font-medium">
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
    </div>
  );
}