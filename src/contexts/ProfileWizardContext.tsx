"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";
import { filterNonEmpty } from "@/lib/utils/wizardStorage";

export type WizardFormData = Record<string, unknown>;

interface ProfileWizardState {
  step: number;
  formData: WizardFormData;
  setStep: (step: number) => void;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  reset: () => void;
}

const ProfileWizardContext = createContext<ProfileWizardState | undefined>(
  undefined
);

export function ProfileWizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<WizardFormData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage once - use a unified storage key
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Try to load from the unified profile creation storage
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE_CREATION);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          step?: number;
          formData?: WizardFormData;
        };

        if (parsed.formData && typeof parsed.formData === "object") {
          // Filter out empty values when loading
          const cleanedData = filterNonEmpty(parsed.formData);
          if (Object.keys(cleanedData).length > 0) {
            setFormData(cleanedData);

            // Check if we have basic data to determine initial step
            const hasBasicData = Boolean(
              cleanedData.profileFor &&
                cleanedData.gender &&
                cleanedData.fullName &&
                cleanedData.dateOfBirth &&
                cleanedData.phoneNumber
            );

            // Set step based on whether we have basic data
            if (hasBasicData) {
              setStep(2);
            } else if (parsed.step && parsed.step >= 1) {
              setStep(parsed.step);
            }
          } else if (parsed.step && parsed.step >= 1) {
            setStep(parsed.step);
          }
        } else if (parsed.step && parsed.step >= 1) {
          setStep(parsed.step);
        }
      }
    } catch (error) {
      console.warn(
        "Failed to load ProfileWizard data from localStorage:",
        error
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist on change - use the same unified storage key
  useEffect(() => {
    // Don't persist until we've loaded initial data
    if (!isLoaded || typeof window === "undefined") return;

    try {
      const dataToStore = {
        step,
        formData: filterNonEmpty(formData),
      };

      localStorage.setItem(
        STORAGE_KEYS.PROFILE_CREATION,
        JSON.stringify(dataToStore)
      );
    } catch (error) {
      console.warn("Failed to save ProfileWizard data to localStorage:", error);
    }
  }, [step, formData, isLoaded]);

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...updates };
      // Log data updates for debugging
      console.log("ProfileWizardContext: Updating formData", {
        updates,
        newData,
      });
      return newData;
    });
  };

  const reset = () => {
    setStep(1);
    setFormData({});
    // Clear localStorage when resetting
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.PROFILE_CREATION);
        // Also clear any legacy storage keys
        localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
        localStorage.removeItem(STORAGE_KEYS.PENDING_IMAGES);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <ProfileWizardContext.Provider
      value={{ step, formData, setStep, updateFormData, reset }}
    >
      {children}
    </ProfileWizardContext.Provider>
  );
}

export function useProfileWizard(): ProfileWizardState {
  const ctx = useContext(ProfileWizardContext);
  if (!ctx) {
    throw new Error(
      "useProfileWizard must be used within ProfileWizardProvider"
    );
  }
  return ctx;
}
