"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type { ProfileCreationData } from "../profileCreation/types";
import { getGlobalRequiredFields } from "../profileCreation/step7";

export function Step7AccountCreation(props: {
  formData: ProfileCreationData;
  setStep: (n: number) => void;
  router: { push: (p: string) => void };
  onComplete?: () => void;
  onError?: (msg?: string) => void;
}) {
  const { formData, setStep, router: _router, onComplete, onError } = props;
  const requiredFields = getGlobalRequiredFields();
  const missingFields = requiredFields.filter((field) => {
    const value = formData[field as keyof ProfileCreationData];
    return !value || (typeof value === "string" && value.trim() === "");
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-serif font-bold text-neutral-dark">Create Your Account</h3>
        <p className="text-sm text-neutral-light font-sans">You're almost there! Complete your registration to start finding matches.</p>
      </div>

      <div className="space-y-6">
        {missingFields.length > 0 ? (
          <div className="text-center p-8 bg-danger/10 backdrop-blur-sm rounded-2xl border border-danger/30 shadow-sm">
            <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
            </div>
            <h4 className="text-danger font-serif font-semibold text-lg mb-2">Profile Incomplete</h4>
            <p className="text-sm text-danger mb-6 font-sans leading-relaxed">
              You must complete all required profile sections before creating an account.
            </p>
            
            <div className="bg-base-light/60 rounded-xl p-4 mb-8 text-left border border-danger/20">
                <p className="text-xs font-bold text-danger uppercase tracking-wider mb-2 font-sans">Missing Information:</p>
                <div className="flex flex-wrap gap-2">
                    {missingFields.map(field => (
                        <span key={field} className="px-2 py-1 bg-danger/10 text-danger text-[10px] rounded-md border border-danger/30 font-medium capitalize font-sans">
                            {field === "profileImageIds" ? "Profile Photos" : field.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                    ))}
                </div>
            </div>

            <Button 
                variant="outline" 
                onClick={() => setStep(1)} 
                className="w-full border-danger/30 text-danger hover:bg-danger/10 rounded-xl h-12 font-sans font-medium transition-all"
            >
              Go back to complete profile
            </Button>
          </div>
        ) : (
          <div className="bg-base-light/50 backdrop-blur-sm rounded-2xl p-6 border border-neutral/10 shadow-sm">
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



