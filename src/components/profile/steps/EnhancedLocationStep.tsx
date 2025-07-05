import React from "react";
import { motion } from "framer-motion";
import { MapPin, Utensils, Wine, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ProfileFormValues } from "@/types/profile";
import { FormSelectField } from "@/components/profile/ProfileFormFields";
import {
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
// import { postcodeSchema } from "@/lib/utils/validation";

interface Props {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  onNext?: () => void;
  onBack?: () => void;
}

const globalCities = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Glasgow",
  "Sheffield",
  "Bradford",
  "Liverpool",
  "Edinburgh",
  "Bristol",
  "Cardiff",
  "Leicester",
  "Wakefield",
  "Coventry",
  "Nottingham",
  "Newcastle",
  "Brighton",
  "Hull",
  "Plymouth",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Derby",
  "Swansea",
  "Southampton", // UK cities
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "San Francisco",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Washington",
  "Boston", // US cities
  "Toronto",
  "Montreal",
  "Vancouver",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Quebec City", // Canadian cities
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Gold Coast",
  "Newcastle",
  "Canberra", // Australian cities
  "Kabul",
  "Kandahar",
  "Herat",
  "Mazar-i-Sharif",
  "Jalalabad",
  "Kunduz",
  "Ghazni",
  "Balkh", // Afghan cities
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Al Ain",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah", // UAE cities
  "Doha",
  "Al Rayyan",
  "Al Wakrah",
  "Al Khor",
  "Umm Salal", // Qatar cities
  "Other",
];

const countries = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Afghanistan",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Germany",
  "France",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Italy",
  "Spain",
  "Portugal",
  "Ireland",
  "Other",
];

const dietOptions = [
  {
    value: "vegetarian",
    label: "Vegetarian",
    icon: "🥗",
    color: "from-green-500 to-green-600",
  },
  {
    value: "non-vegetarian",
    label: "Non-Vegetarian",
    icon: "🍖",
    color: "from-red-500 to-red-600",
  },
  {
    value: "vegan",
    label: "Vegan",
    icon: "🌱",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    value: "eggetarian",
    label: "Eggetarian",
    icon: "🥚",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    value: "other",
    label: "Other",
    icon: "🍽️",
    color: "from-gray-500 to-gray-600",
  },
];

const lifestyleOptions = {
  smoking: [
    { value: "no", label: "No", icon: "🚭", description: "Non-smoker" },
    {
      value: "occasionally",
      label: "Occasionally",
      icon: "🚬",
      description: "Social smoker",
    },
    { value: "yes", label: "Yes", icon: "🚬", description: "Regular smoker" },
  ],
  drinking: [
    { value: "no", label: "No", icon: "🚫", description: "Non-drinker" },
    {
      value: "occasionally",
      label: "Occasionally",
      icon: "🍷",
      description: "Social drinker",
    },
    { value: "yes", label: "Yes", icon: "🍻", description: "Regular drinker" },
  ],
};

const physicalStatusOptions = [
  {
    value: "normal",
    label: "Normal",
    icon: "💪",
    description: "No physical limitations",
  },
  {
    value: "differently-abled",
    label: "Differently-abled",
    icon: "♿",
    description: "Physical considerations",
  },
  {
    value: "other",
    label: "Other",
    icon: "❓",
    description: "Prefer to specify later",
  },
];

export default function EnhancedLocationStep({ form }: Props) {
  const { control } = form;
  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h3 className="text-xl  font-semibold text-foreground">
          Where you live and how you live
        </h3>
        <p className="text-muted-foreground">
          Help us understand your location and lifestyle preferences
        </p>
      </motion.div>

      {/* Location Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg font-semibold text-foreground">Location</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City */}
            <FormSelectField
              name="city"
              label="City"
              form={form}
              placeholder="Select your city"
              isRequired={true}
              options={globalCities.map((city: string) => ({
                value: city,
                label: city,
              }))}
            />

            {/* Country */}
            <FormSelectField
              name="country"
              label="Country"
              form={form}
              placeholder="Select your country"
              isRequired={true}
              options={countries.map((country: string) => ({
                value: country,
                label: country,
              }))}
            />
          </div>
        </Card>
      </motion.div>

      {/* Diet Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Diet Preferences
            </h4>
          </div>

          <ShadcnFormField
            control={control}
            name="diet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dietary Preference</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dietOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                          field.value === option.value
                            ? "border-[#BFA67A] bg-[#BFA67A]/10 shadow-md"
                            : "border-gray-200 hover:border-[#BFA67A]/50",
                        )}
                      >
                        <span className="text-2xl mb-2">{option.icon}</span>
                        <span
                          className={cn(
                            "text-sm font-medium text-center",
                            field.value === option.value
                              ? "text-[#BFA67A]"
                              : "text-gray-700",
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

      {/* Lifestyle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Wine className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Lifestyle
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Smoking */}
            <div>
              <ShadcnFormField
                control={control}
                name="smoking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Smoking</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {lifestyleOptions.smoking.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-sm text-left",
                              field.value === option.value
                                ? "border-[#BFA67A] bg-[#BFA67A]/10"
                                : "border-gray-200 hover:border-[#BFA67A]/50",
                            )}
                          >
                            <span className="text-xl">{option.icon}</span>
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "font-medium text-sm",
                                  field.value === option.value
                                    ? "text-[#BFA67A]"
                                    : "text-gray-700",
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {option.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Drinking */}
            <div>
              <ShadcnFormField
                control={control}
                name="drinking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drinking</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {lifestyleOptions.drinking.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-sm text-left",
                              field.value === option.value
                                ? "border-[#BFA67A] bg-[#BFA67A]/10"
                                : "border-gray-200 hover:border-[#BFA67A]/50",
                            )}
                          >
                            <span className="text-xl">{option.icon}</span>
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "font-medium text-sm",
                                  field.value === option.value
                                    ? "text-[#BFA67A]"
                                    : "text-gray-700",
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {option.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Physical Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-[#BFA67A]">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#BFA67A]" />
            <h4 className="text-lg  font-semibold text-foreground">
              Physical Status
            </h4>
          </div>

          <ShadcnFormField
            control={control}
            name="physicalStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Physical Status</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {physicalStatusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                          field.value === option.value
                            ? "border-[#BFA67A] bg-[#BFA67A]/10 shadow-md"
                            : "border-gray-200 hover:border-[#BFA67A]/50",
                        )}
                      >
                        <span className="text-2xl mb-2">{option.icon}</span>
                        <div className="text-center">
                          <div
                            className={cn(
                              "text-sm font-medium",
                              field.value === option.value
                                ? "text-[#BFA67A]"
                                : "text-gray-700",
                            )}
                          >
                            {option.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {option.description}
                          </div>
                        </div>
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
    </div>
  );
}
