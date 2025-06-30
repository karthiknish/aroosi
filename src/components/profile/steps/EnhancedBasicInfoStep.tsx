import React from "react";
import { motion } from "framer-motion";
import { Ruler } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cmToFeetInches } from "@/lib/utils/height";
import type { ProfileFormValues } from "@/types/profile";
import {
  FormField,
  FormDateField,
  FormPhoneField,
} from "@/components/profile/ProfileFormFields";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FormField as ShadcnFormField } from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface Props {
  form: import("react-hook-form").UseFormReturn<Partial<ProfileFormValues>>;
  onNext?: () => void;
  onBack?: () => void;
}

const genderOptions = [
  { value: "male", label: "Male", icon: "👨" },
  { value: "female", label: "Female", icon: "👩" },
  { value: "other", label: "Other", icon: "🧑" },
];

const profileForOptions = [
  { value: "self", label: "Myself", icon: "🧑" },
  { value: "friend", label: "Friend", icon: "👫" },
  { value: "family", label: "Family Member", icon: "👨‍👩‍👧‍👦" },
];

export default function EnhancedBasicInfoStep({ form }: Props) {
  const { control } = form;

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h3 className="text-xl font-semibold text-primary">
          Let&apos;s start with the basics
        </h3>
        <p className="text-muted-foreground">
          This information helps us create your profile and find better matches
        </p>
      </motion.div>

      {/* Profile For */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="space-y-3"
      >
        <ShadcnFormField
          control={control}
          name="profileFor"
          rules={{ required: "Please select who this profile is for" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile For</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-3">
                  {profileForOptions.map((option) => (
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
                          "text-sm font-medium",
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
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <FormField name="fullName" label="Full Name" form={form} isRequired />
        </motion.div>

        {/* Phone Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <FormPhoneField
            name="phoneNumber"
            label="Phone Number"
            form={form}
            isRequired
          />
        </motion.div>

        {/* Date of Birth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <FormDateField
            name="dateOfBirth"
            label="Date of Birth"
            form={form}
            isRequired
          />
        </motion.div>

        {/* Gender */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <ShadcnFormField
            control={control}
            name="gender"
            rules={{ required: "Gender is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Gender <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-3">
                    {genderOptions.map((option) => (
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
                            "text-sm font-medium",
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
        </motion.div>
      </div>

      {/* Height Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <ShadcnFormField
          control={control}
          name="height"
          rules={{ required: "Height is required" }}
          render={({ field }) => {
            const numVal = Number(field.value);
            const safeNumVal =
              !isNaN(numVal) && numVal >= 137 && numVal <= 198 ? numVal : 170;
            return (
              <FormItem>
                <FormLabel>
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" />
                    Height <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <div className="space-y-6">
                    {/* Height Display */}
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-purple-200">
                        <Ruler className="w-5 h-5 text-purple-500" />
                        <span className="text-2xl font-bold text-purple-700">
                          {!isNaN(numVal) && numVal >= 137 && numVal <= 198
                            ? cmToFeetInches(numVal)
                            : "Select height"}
                        </span>
                        <span className="text-lg text-purple-600">
                          {!isNaN(numVal) &&
                            numVal >= 137 &&
                            numVal <= 198 &&
                            `(${numVal} cm)`}
                        </span>
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="space-y-4">
                      <Slider
                        value={[safeNumVal]}
                        onValueChange={([val]: [number]) => {
                          field.onChange(String(val));
                        }}
                        min={137}
                        max={198}
                        step={1}
                        className="w-full"
                      />

                      {/* Height Range Labels */}
                      <div className="flex justify-between text-sm text-gray-500">
                        <div className="text-center">
                          <div className="font-medium">4&apos;6&quot;</div>
                          <div className="text-xs">137 cm</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">5&apos;6&quot;</div>
                          <div className="text-xs">168 cm</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">6&apos;6&quot;</div>
                          <div className="text-xs">198 cm</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </motion.div>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Why do we need this information?</p>
            <p>
              This helps us verify your identity and find compatible matches.
              Your phone number is kept private and used only for account
              security.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
