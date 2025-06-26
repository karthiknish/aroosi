"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  MapPin,
  Heart,
  GraduationCap,
  Camera,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "@/types/profile";
import type { ImageType } from "@/types/image";
import { Form } from "@/components/ui/form";
import { showErrorToast } from "@/lib/ui/toast";

// Import step components (we'll enhance these)
import EnhancedBasicInfoStep from "./steps/EnhancedBasicInfoStep";
import EnhancedLocationStep from "./steps/EnhancedLocationStep";
import EnhancedCulturalStep from "./steps/EnhancedCulturalStep";
import EnhancedEducationStep from "./steps/EnhancedEducationStep";
import EnhancedImagesStep from "./steps/EnhancedImagesStep";

interface Props {
  initialValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  profileId?: string;
}

const steps = [
  {
    id: "basic",
    title: "Basic Info",
    subtitle: "Tell us about yourself",
    icon: User,
    color: "from-blue-500 to-blue-600",
    fields: ["fullName", "dateOfBirth", "gender", "height", "phoneNumber"],
  },
  {
    id: "location",
    title: "Location & Lifestyle",
    subtitle: "Where you live and how you live",
    icon: MapPin,
    color: "from-green-500 to-green-600",
    fields: [
      "city",
      "country",
      "diet",
      "smoking",
      "drinking",
      "physicalStatus",
    ],
  },
  {
    id: "cultural",
    title: "Cultural Background",
    subtitle: "Your heritage and beliefs",
    icon: Heart,
    color: "from-purple-500 to-purple-600",
    fields: [],
  },
  {
    id: "education",
    title: "Education & Career",
    subtitle: "Your professional life",
    icon: GraduationCap,
    color: "from-orange-500 to-orange-600",
    fields: ["education", "occupation", "aboutMe"],
  },
  {
    id: "photos",
    title: "Photos",
    subtitle: "Show your beautiful self",
    icon: Camera,
    color: "from-indigo-500 to-indigo-600",
    fields: ["profileImageIds"],
  },
];

export default function EnhancedProfileWizard({
  initialValues = {},
  loading = false,
  serverError,
  profileId = "",
  onSubmit,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageType[]>([]);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>(
    {}
  );

  const form = useForm<Partial<ProfileFormValues>>({
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "",
      height: "",
      phoneNumber: "",
      city: "",
      country: "",
      diet: "",
      smoking: "",
      drinking: "",
      physicalStatus: "",
      religion: "",
      motherTongue: "",
      ethnicity: "",
      education: "",
      occupation: "",
      annualIncome: "",
      aboutMe: "",
      interests: "",
      lookingFor: "",
      profileImageIds: [],
      profileFor: "self",
      preferredGender: "any",
      ...initialValues,
    } as Partial<ProfileFormValues>,
  });

  const currentStepData = steps[currentStep];

  // Check if current step is valid
  const isCurrentStepValid = useCallback(() => {
    const currentFields = currentStepData.fields;
    const formValues = form.getValues();
    const errors = form.formState.errors;

    // Check if required fields are filled and have no errors
    const hasRequiredFields = currentFields.every((field) => {
      const value = formValues[field as keyof ProfileFormValues];
      // Handle different types of empty values
      if (value === undefined || value === null || value === "") {
        return false;
      }
      // Handle arrays (like profileImageIds)
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    });

    const hasNoErrors = currentFields.every(
      (field) => !errors[field as keyof ProfileFormValues]
    );

    return hasRequiredFields && hasNoErrors;
  }, [currentStepData.fields, form, currentStep]);

  // Simple validation on step change
  useEffect(() => {
    const isValid = isCurrentStepValid();
    setStepValidation((prev) => ({
      ...prev,
      [currentStep]: isValid,
    }));

    if (isValid && !completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    // Validate current step before proceeding
    const isValid = isCurrentStepValid();
    setStepValidation((prev) => ({
      ...prev,
      [currentStep]: isValid,
    }));

    if (isValid) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep]);
      }

      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    } else {
      // Show toast with missing/invalid fields
      const currentFields = currentStepData.fields;
      const formValues = form.getValues();
      const errors = form.formState.errors;
      const missingFields = currentFields.filter((field) => {
        const value = formValues[field as keyof ProfileFormValues];
        if (value === undefined || value === null || value === "") {
          return true;
        }
        if (Array.isArray(value) && value.length === 0) {
          return true;
        }
        return false;
      });
      const errorFields = currentFields.filter(
        (field) => errors[field as keyof ProfileFormValues]
      );
      const allIssues = Array.from(new Set([...missingFields, ...errorFields]));
      if (allIssues.length > 0) {
        showErrorToast(
          `Please complete the following fields to continue: ${allIssues
            .map((f) =>
              f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
            )
            .join(", ")}`
        );
      } else {
        showErrorToast("Please fix the errors on this step to continue.");
      }
    }
  }, [
    currentStep,
    isCurrentStepValid,
    completedSteps,
    currentStepData.fields,
    form,
  ]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Allow clicking on previous steps or the next step if current is valid
      if (
        stepIndex <= currentStep ||
        (stepIndex === currentStep + 1 && stepValidation[currentStep])
      ) {
        setCurrentStep(stepIndex);
      }
    },
    [currentStep, stepValidation]
  );

  const handleImagesChanged = useCallback((images: ImageType[] | string[]) => {
    if (typeof images[0] === "string") {
      return;
    }
    setUploadedImages(images as ImageType[]);
  }, []);

  const handleImageDelete = useCallback(async (imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleImageReorder = useCallback((newOrder: ImageType[]) => {
    setUploadedImages(newOrder);
  }, []);

  const renderStep = () => {
    const stepProps = {
      form,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 0:
        return <EnhancedBasicInfoStep {...stepProps} />;
      case 1:
        return <EnhancedLocationStep {...stepProps} />;
      case 2:
        return <EnhancedCulturalStep {...stepProps} />;
      case 3:
        return <EnhancedEducationStep {...stepProps} />;
      case 4:
        return (
          <EnhancedImagesStep
            {...stepProps}
            images={uploadedImages}
            onImagesChanged={handleImagesChanged}
            onImageDelete={handleImageDelete}
            onImageReorder={handleImageReorder}
            profileId={profileId}
          />
        );
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-[#BFA67A]" />
            <h1
              style={{
                lineHeight: 1.3,
              }}
              className="text-4xl font-serif font-bold text-primary"
            >
              Create Your Profile
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let&apos;s help you find your perfect match
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Step Navigation Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-80 space-y-4"
          >
            {/* Progress Overview */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border border-[#BFA67A] shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Progress</h3>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-[#BFA67A] border border-[#BFA67A]"
                  >
                    {currentStep + 1} of {steps.length}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Completion</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="h-3 bg-yellow-100 rounded-full overflow-hidden border border-[#BFA67A]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#BFA67A] to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Step List */}
            <Card className="p-4 bg-white/80 backdrop-blur-sm border border-[#BFA67A] shadow-xl">
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const isCompleted = completedSteps.includes(index);
                  const isCurrent = index === currentStep;
                  const isAccessible =
                    index <= currentStep ||
                    (index === currentStep + 1 && stepValidation[currentStep]);
                  const Icon = step.icon;

                  return (
                    <motion.button
                      key={step.id}
                      onClick={() => handleStepClick(index)}
                      disabled={!isAccessible}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all duration-200 group ",
                        isCurrent &&
                          "bg-gradient-to-r from-[#BFA67A] to-pink-500 text-white shadow-lg transform scale-105 border border-[#BFA67A]",
                        isCompleted &&
                          !isCurrent &&
                          "bg-green-50 border border-green-200 hover:bg-green-100 text-green-900",
                        !isCompleted &&
                          !isCurrent &&
                          isAccessible &&
                          "bg-yellow-50 hover:bg-yellow-100 border border-[#BFA67A] text-foreground",
                        !isAccessible && "opacity-40 cursor-not-allowed"
                      )}
                      whileHover={isAccessible ? { scale: 1.02 } : {}}
                      whileTap={isAccessible ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors border border-[#BFA67A]",
                            isCurrent && "bg-white/20",
                            isCompleted &&
                              !isCurrent &&
                              "bg-green-500 text-white border-green-500",
                            !isCompleted &&
                              !isCurrent &&
                              "bg-yellow-200 text-yellow-900 group-hover:bg-yellow-300"
                          )}
                        >
                          {isCompleted && !isCurrent ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              "font-medium truncate ",
                              isCurrent && "text-white",
                              !isCurrent && "text-foreground"
                            )}
                          >
                            {step.title}
                          </h4>
                          <p
                            className={cn(
                              "text-sm truncate",
                              isCurrent && "text-white/80",
                              !isCurrent && "text-muted-foreground"
                            )}
                          >
                            {step.subtitle}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border border-[#BFA67A] shadow-xl">
                  {/* Step Header */}
                  <div
                    className={cn(
                      "p-8 rounded-t-xl bg-gradient-to-r",
                      currentStepData.color
                    )}
                  >
                    <div className="flex items-center gap-4 text-white">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border border-[#BFA67A]">
                        <currentStepData.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold ">
                          {currentStepData.title}
                        </h2>
                        <p className="text-white/80 ">
                          {currentStepData.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="p-8">
                    <Form {...form}>{renderStep()}</Form>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {serverError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <p className="text-red-600 font-medium">
                          {serverError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between py-6 px-4 border-t border-[#BFA67A]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 border border-[#BFA67A] text-[#BFA67A] hover:bg-yellow-50 hover:text-[#BFA67A] "
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>

                    <Button
                      type="button"
                      onClick={
                        currentStep === steps.length - 1
                          ? () =>
                              onSubmit(form.getValues() as ProfileFormValues)
                          : handleNext
                      }
                      disabled={loading}
                      className="bg-gradient-to-r from-[#BFA67A] to-pink-500 hover:from-[#BFA67A] hover:to-pink-600 text-white flex items-center gap-2 min-w-[120px]  border border-[#BFA67A]"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : currentStep === steps.length - 1 ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Complete Profile
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
