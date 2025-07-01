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

  // Load from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE_CREATION);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          step?: number;
          formData?: WizardFormData;
        };
        if (parsed.step) setStep(parsed.step);
        if (parsed.formData) setFormData(parsed.formData);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEYS.PROFILE_CREATION,
        JSON.stringify({ step, formData: filterNonEmpty(formData) })
      );
    } catch {
      /* ignore */
    }
  }, [step, formData]);

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setStep(1);
    setFormData({});
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
