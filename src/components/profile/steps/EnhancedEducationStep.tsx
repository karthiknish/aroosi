import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  PoundSterling,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProfileFormValues } from "@/types/profile";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/profile/ProfileFormFields";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { FormField as ShadcnFormField } from "@/components/ui/form";

interface Props {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  onNext?: () => void;
  onBack?: () => void;
}

const educationOptions = [
  {
    value: "high-school",
    label: "High School",
    icon: "🎓",
    description: "Secondary education completed",
    level: 1,
  },
  {
    value: "college",
    label: "College/A-Levels",
    icon: "📚",
    description: "Further education qualification",
    level: 2,
  },
  {
    value: "bachelors",
    label: "Bachelor's Degree",
    icon: "🎓",
    description: "Undergraduate university degree",
    level: 3,
  },
  {
    value: "masters",
    label: "Master's Degree",
    icon: "👨‍🎓",
    description: "Postgraduate university degree",
    level: 4,
  },
  {
    value: "phd",
    label: "PhD/Doctorate",
    icon: "👨‍🏫",
    description: "Highest academic qualification",
    level: 5,
  },
  {
    value: "trade",
    label: "Trade/Vocational",
    icon: "🔧",
    description: "Professional skills training",
    level: 2,
  },
  {
    value: "other",
    label: "Other",
    icon: "📋",
    description: "Alternative qualification",
    level: 2,
  },
];

const incomeOptions = [
  { value: "under-20k", label: "Under £20,000", icon: "💷" },
  { value: "20k-30k", label: "£20,000 - £30,000", icon: "💷" },
  { value: "30k-40k", label: "£30,000 - £40,000", icon: "💷" },
  { value: "40k-50k", label: "£40,000 - £50,000", icon: "💷" },
  { value: "50k-60k", label: "£50,000 - £60,000", icon: "💷" },
  { value: "60k-80k", label: "£60,000 - £80,000", icon: "💷" },
  { value: "80k-100k", label: "£80,000 - £100,000", icon: "💷" },
  { value: "over-100k", label: "Over £100,000", icon: "💷" },
  { value: "prefer-not-to-say", label: "Prefer not to say", icon: "🙈" },
];

export default function EnhancedEducationStep({ form }: Props) {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h3 className="text-xl  font-semibold text-foreground">
          Your education and career
        </h3>
        <p className="text-muted-foreground">
          Tell us about your professional background and aspirations
        </p>
      </motion.div>

      {/* Education */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Education Level
            </h4>
          </div>

          <ShadcnFormField
            control={form.control}
            name="education"
            rules={{ required: "Education level is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Highest Education Level</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {educationOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                          field.value === option.value
                            ? "border-[#BFA67A] bg-[#BFA67A]/10 shadow-md"
                            : "border-gray-200 hover:border-[#BFA67A]/50"
                        )}
                      >
                        <span className="text-2xl mb-2">{option.icon}</span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            field.value === option.value
                              ? "text-[#BFA67A]"
                              : "text-gray-700"
                          )}
                        >
                          {option.label}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>
      </motion.div>

      {/* Occupation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">
              Current Occupation
            </h4>
          </div>

          <FormField
            name="occupation"
            label="Job Title"
            form={form}
            placeholder="e.g., Software Engineer, Teacher, Doctor"
            isRequired={true}
          />
        </Card>
      </motion.div>

      {/* Income */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <PoundSterling className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Income Range
            </h4>
            <Badge variant="secondary" className="text-xs">
              Optional
            </Badge>
          </div>

          <ShadcnFormField
            control={form.control}
            name="annualIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Income</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {incomeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                          field.value === option.value
                            ? "border-[#BFA67A] bg-[#BFA67A]/10 shadow-md"
                            : "border-gray-200 hover:border-[#BFA67A]/50"
                        )}
                      >
                        <span className="text-2xl mb-2">{option.icon}</span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            field.value === option.value
                              ? "text-[#BFA67A]"
                              : "text-gray-700"
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>
      </motion.div>

      {/* About Me */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">About Me</h4>
          </div>

          <FormField
            name="aboutMe"
            label="Tell us about yourself"
            form={form}
            placeholder="Share your interests, goals, what makes you unique..."
            description="This helps potential matches get to know you better"
            textarea={true}
          />
        </Card>
      </motion.div>
    </div>
  );
}
