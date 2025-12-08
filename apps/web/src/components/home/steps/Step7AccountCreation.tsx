"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type { ProfileCreationData } from "../profileCreation/types";

export function Step7AccountCreation(props: {
  formData: ProfileCreationData;
  setStep: (n: number) => void;
  router: { push: (p: string) => void };
  onComplete?: () => void;
  onError?: (msg?: string) => void;
}) {
  const { formData, setStep, router: _router, onComplete, onError } = props;
  const requiredFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "city",
    "aboutMe",
    "occupation",
    "education",
    "height",
    "maritalStatus",
    "phoneNumber",
  ];
  const missingFields = requiredFields.filter((field) => {
    const value = formData[field as keyof ProfileCreationData];
    return !value || (typeof value === "string" && value.trim() === "");
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Create Account</h3>
        <p className="text-sm text-gray-600">Finish and create your account</p>
      </div>
      <div className="space-y-4">
        {missingFields.length > 0 ? (
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 font-semibold mb-2">⚠️ Cannot create account - Profile incomplete</p>
            <p className="text-sm text-red-500 mb-4">You must complete all profile sections before creating an account.</p>
            <p className="text-xs text-red-400 mb-4">
              Missing: {missingFields.slice(0, 5).join(", ")}
              {missingFields.length > 5 && ` and ${missingFields.length - 5} more fields`}
            </p>
            <Button variant="outline" onClick={() => setStep(1)} className="border-red-300 text-red-600 hover:bg-red-50">
              Go back to complete profile
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const CustomSignupForm = dynamic(() => import("@/components/auth/CustomSignupForm"), { ssr: false });
              return <CustomSignupForm onComplete={onComplete} onError={onError} />;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}



