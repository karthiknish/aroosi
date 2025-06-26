import React from "react";
import { motion } from "framer-motion";
import { Heart, Globe, MessageCircle, Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ProfileFormValues } from "@/types/profile";
import { FormField } from "@/components/profile/ProfileFormFields";
import {
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { MOTHER_TONGUE_OPTIONS, RELIGION_OPTIONS, ETHNICITY_OPTIONS } from "@/lib/constants/languages";

interface Props {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  onNext?: () => void;
  onBack?: () => void;
}

const maritalStatusOptions = [
  {
    value: "single",
    label: "Single",
    icon: "💙",
    description: "Never married",
  },
  {
    value: "divorced",
    label: "Divorced",
    icon: "💔",
    description: "Previously married",
  },
  {
    value: "widowed",
    label: "Widowed",
    icon: "🖤",
    description: "Lost spouse",
  },
  {
    value: "annulled",
    label: "Annulled",
    icon: "⚪",
    description: "Marriage annulled",
  },
];

const preferredGenderOptions = [
  { value: "male", label: "Male", icon: "👨" },
  { value: "female", label: "Female", icon: "👩" },
  { value: "any", label: "Any", icon: "🌈" },
];

export default function EnhancedCulturalStep({ form }: Props) {
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h3 className="text-xl  font-semibold text-foreground">
          Your cultural background and beliefs
        </h3>
        <p className="text-muted-foreground">
          Help us understand your heritage and values for better matches
        </p>
      </motion.div>

      {/* Marital Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Marital Status
            </h4>
          </div>

          <ShadcnFormField
            control={form.control}
            name="maritalStatus"
            rules={{ required: "Marital status is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Marital Status</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {maritalStatusOptions.map((option) => (
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

      {/* Mother Tongue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">
              Mother Tongue
            </h4>
          </div>

          <ShadcnFormField
            control={form.control}
            name="motherTongue"
            rules={{ required: "Mother tongue is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Primary Language</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MOTHER_TONGUE_OPTIONS.map((option) => (
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
                            "text-sm font-medium text-center",
                            field.value === option.value
                              ? "text-[#BFA67A]"
                              : "text-gray-700"
                          )}
                        >
                          {option.label}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 text-center">
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

      {/* Religion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">
              Religion
            </h4>
          </div>

          <ShadcnFormField
            control={form.control}
            name="religion"
            rules={{ required: "Religion is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Religious Faith</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-3">
                    {RELIGION_OPTIONS.map((option) => (
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
                            "text-sm font-medium text-center",
                            field.value === option.value
                              ? "text-[#BFA67A]"
                              : "text-gray-700"
                          )}
                        >
                          {option.label}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 text-center">
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

      {/* Ethnicity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">
              Ethnicity
            </h4>
          </div>

          <ShadcnFormField
            control={form.control}
            name="ethnicity"
            rules={{ required: "Ethnicity is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Ethnic Background</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ETHNICITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                          field.value === option.value
                            ? "border-[#BFA67A] bg-[#BFA67A]/10 shadow-md"
                            : "border-gray-200 hover:border-[#BFA67A]/50"
                        )}
                      >
                        <span className="text-xl mb-1">{option.icon}</span>
                        <span
                          className={cn(
                            "text-xs font-medium text-center",
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

      {/* Partner Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">
              Partner Preferences
            </h4>
          </div>

          <div className="space-y-4">
            <ShadcnFormField
              control={form.control}
              name="preferredGender"
              rules={{ required: "Preferred gender is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Gender</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      {preferredGenderOptions.map((option) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="partnerPreferenceAgeMin"
                label="Minimum Age"
                form={form}
                type="number"
                placeholder="e.g., 25"
                isRequired={true}
              />

              <FormField
                name="partnerPreferenceAgeMax"
                label="Maximum Age"
                form={form}
                type="number"
                placeholder="e.g., 35"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Location Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  text-foreground">Location Preferences</h4>
          </div>

          <FormField
            name="partnerPreferenceCity"
            label="Preferred Cities"
            form={form}
            placeholder="e.g., London, Manchester, Birmingham"
            description="Enter cities where you'd like to find matches (comma-separated)"
          />
        </Card>
      </motion.div>
    </div>
  );
}
