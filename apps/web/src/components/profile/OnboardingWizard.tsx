"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, User, MapPin, Camera, Heart, Info, Loader2 } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { patchJson, getJson } from "@/lib/http/client";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { PhoneInput } from "@/components/ui/phone-input";

const steps = [
  { id: 1, title: "Basic Info", icon: User },
  { id: 2, title: "Location", icon: MapPin },
  { id: 3, title: "About & Media", icon: Camera },
  { id: 4, title: "Preferences", icon: Heart },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    city: "",
    country: "Afghanistan",
    phoneNumber: "",
    aboutMe: "",
    partnerPreferenceAgeMin: 18,
    partnerPreferenceAgeMax: 40,
  });

  useEffect(() => {
    async function loadOnboarding() {
      try {
        const res = await getJson<any>("/api/profile/onboarding");
        if (res.success && res.data?.onboarding) {
          const { step, ...data } = res.data.onboarding;
          setFormData((prev: any) => ({ ...prev, ...data }));
          if (step) setCurrentStep(step);
        }
      } catch (e) {
        console.error("Failed to load onboarding", e);
      } finally {
        setLoading(false);
      }
    }
    loadOnboarding();
  }, []);

  const saveProgress = async (step: number, completed = false) => {
    setSaving(true);
    try {
      await patchJson("/api/profile/onboarding", {
        step,
        data: formData,
        completed
      });
      if (completed) {
        showSuccessToast("Onboarding complete!");
        router.push("/profile");
      }
    } catch (e) {
      showErrorToast(null, "Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveProgress(nextStep);
    } else {
      saveProgress(currentStep, true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-neutral-light">Resuming your progress...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 overflow-hidden relative ring-1 ring-black/5 rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x" />
        
        <div className="p-8">
          <div className="flex justify-between mb-12">
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-2 relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  currentStep >= s.id ? "bg-primary border-primary text-white" : "bg-neutral/5 border-neutral/10 text-neutral-light"
                )}>
                  {currentStep > s.id ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  currentStep >= s.id ? "text-primary" : "text-neutral-light/50"
                )}>
                  {s.title}
                </span>
              </div>
            ))}
            <div className="absolute top-[52px] left-[15%] right-[15%] h-[2px] bg-neutral/5 -z-0" />
            <motion.div 
              className="absolute top-[52px] left-[15%] h-[2px] bg-primary -z-0"
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 70}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[400px]"
            >
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-serif font-bold text-neutral-dark">Let's start with the basics</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input 
                        value={formData.fullName} 
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        placeholder="e.g. Ahmad Shah"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <DatePicker 
                        date={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                        setDate={(date) => setFormData({...formData, dateOfBirth: date ? format(date, "yyyy-MM-dd") : ""})}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {["male", "female"].map((g) => (
                          <Button
                            key={g}
                            variant={formData.gender === g ? "default" : "outline"}
                            onClick={() => setFormData({...formData, gender: g})}
                            className="h-14 rounded-xl capitalize"
                          >
                            {g}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-serif font-bold text-neutral-dark">Where are you located?</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input 
                        value={formData.city} 
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        placeholder="e.g. Kabul"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <PhoneInput 
                        value={formData.phoneNumber}
                        onChange={(val) => setFormData({...formData, phoneNumber: val})}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-serif font-bold text-neutral-dark">Share your story</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>About Me</Label>
                      <textarea 
                        value={formData.aboutMe} 
                        onChange={(e) => setFormData({...formData, aboutMe: e.target.value})}
                        placeholder="Tell others about yourself, your values and what you're looking for..."
                        className="w-full h-32 p-4 bg-neutral/5 border border-neutral/10 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                      />
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-sm text-primary-dark font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Photos can be added in the next step
                      </p>
                      <p className="text-xs text-neutral-light mt-1">We'll help you upload your best photos after this wizard.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-serif font-bold text-neutral-dark">Who are you looking for?</h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label>Preferred Age Range</Label>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          value={formData.partnerPreferenceAgeMin}
                          onChange={(e) => setFormData({...formData, partnerPreferenceAgeMin: parseInt(e.target.value)})}
                          className="w-20 rounded-xl h-12"
                        />
                        <span className="text-neutral-light">to</span>
                        <Input 
                          type="number" 
                          value={formData.partnerPreferenceAgeMax}
                          onChange={(e) => setFormData({...formData, partnerPreferenceAgeMax: parseInt(e.target.value)})}
                          className="w-20 rounded-xl h-12"
                        />
                      </div>
                    </div>
                    <div className="bg-base-light p-6 rounded-3xl border border-neutral/5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Heart className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-dark">Final Step</h4>
                        <p className="text-sm text-neutral-light leading-relaxed">By completing this onboarding, your profile will be visible to potential matches. You can always refine your full profile later.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex justify-between items-center pt-8 border-t border-neutral/10">
            <Button
              variant="ghost"
              onClick={handleBack}
              className={cn("text-neutral-light font-bold px-8 h-12", currentStep === 1 && "invisible")}
              disabled={saving}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={saving}
              className="bg-primary hover:bg-primary-dark text-white px-10 h-12 rounded-2xl font-bold shadow-xl shadow-primary/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : currentStep === steps.length ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </Card>
      <p className="text-center mt-8 text-xs text-neutral-light/60 flex items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        Your progress is automatically saved as you go.
      </p>
    </div>
  );
}
