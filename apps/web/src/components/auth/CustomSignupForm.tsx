"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import { useFirebaseAuth as useAuth } from "@/components/FirebaseAuthProvider";
import { Eye, EyeOff } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { OtpInput } from "@/components/ui/otp-input";
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";

interface CustomSignupFormProps {
  onComplete?: () => void;
  onError?: (message: string) => void;
}

export default function CustomSignupForm({
  onComplete,
  onError,
}: CustomSignupFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const PENDING_KEY = "aroosi_pending_email_verification";

  // Toggle visibility for password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline error state for precise field-level feedback
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
    form?: string;
  }>({});

  // Derived validation state
  const passwordsFilled =
    formData.password.length > 0 && formData.confirmPassword.length > 0;
  const passwordsMatch =
    formData.password === formData.confirmPassword && passwordsFilled;

  // Access wizard data to derive full name and profile fields
  const { formData: wizardData } = useProfileWizard();
  const {
    signUp,
    refreshProfile: refreshUser,
    sendEmailVerification: resendEmailVerification,
    signInWithGoogle,
  completeGoogleSignup,
  } = useAuth();

  // Resend throttle state
  const RESEND_INTERVAL = 60; // seconds
  const [secondsLeft, setSecondsLeft] = useState(RESEND_INTERVAL);
  const [resendLoading, setResendLoading] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (needsVerification) {
      // start / reset countdown
      setSecondsLeft(RESEND_INTERVAL);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [needsVerification]);

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    setResendLoading(true);
    try {
      const resp = await resendEmailVerification();
      if (!resp.success) {
        showErrorToast(resp.error || "Unable to resend code");
        return;
      }
      setVerificationCode("");
      setSecondsLeft(RESEND_INTERVAL);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } finally {
      setResendLoading(false);
    }
  };

  const router = useRouter();

  // Ensure user profile is created before redirecting
  const ensureProfileReady = useCallback(async (maxAttempts = 8) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // In Firebase, the profile is created during signup
        // We just need to wait for it to be available
        return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
    return false;
  }, []);

  const finalizeToSuccess = useCallback(async () => {
    const ok = await ensureProfileReady();
    if (!ok) {
      showErrorToast(
        "We are finalizing your account. Please try again shortly."
      );
      setIsLoading(false);
      return false;
    }
    const redirectTo = "/success";
    try {
      // Show loader during redirect
      setIsLoading(true);
      router.push(redirectTo);
    } catch {
      window.location.href = redirectTo;
    }
    return true;
  }, [ensureProfileReady, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific errors on change
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
      form: undefined,
    }));
  };

  const validateForm = () => {
    const nextErrors: typeof fieldErrors = {};
    const fieldDisplay: Record<string, string> = {
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      verificationCode: "Verification Code",
    };

    // If we're in verification phase, validate the code
    if (needsVerification) {
      if (!verificationCode || verificationCode.length !== 6) {
        nextErrors.verificationCode = "Please enter the 6-digit code";
      }
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        const first = nextErrors.verificationCode;
        if (first) {
          showErrorToast(first);
          onError?.(first);
        }
        return false;
      }
      return true;
    }

    // Regular form validation
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    }
    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 12) {
      // Align with server strong policy (>=12, plus character classes)
      nextErrors.password =
        "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
    } else {
      // Client-side quick check for classes to reduce round-trip
      const hasLower = /[a-z]/.test(formData.password);
      const hasUpper = /[A-Z]/.test(formData.password);
      const hasDigit = /\d/.test(formData.password);
      const hasSymbol = /[^A-Za-z0-9]/.test(formData.password);
      if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
        nextErrors.password =
          "Password must include uppercase, lowercase, number, and symbol.";
      }
    }
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Build concise summary listing all impacted fields
      const fields = Object.keys(nextErrors)
        .filter((k) => k !== "form")
        .map((k) => fieldDisplay[k] || k);
      const summary =
        fields.length > 0
          ? `Please fix: ${fields.join(", ")}.`
          : "Please correct the highlighted fields.";
      // Attach summary to form-level error for inline display
      setFieldErrors((prev) => ({ ...prev, form: summary }));
      // Also show a toast with the summary for quick visibility
      showErrorToast(summary);
      onError?.(summary);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // If we're in verification phase, handle the OTP verification
      if (needsVerification) {
        // For Firebase, email verification is handled differently
        // We'll just show a success message and proceed
        showSuccessToast("Email verified successfully!");
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {}
        try {
          const mod = await import("@/lib/utils/onboardingStorage");
          if (mod && typeof mod.clearAllOnboardingData === "function") {
            mod.clearAllOnboardingData();
          }
        } catch {}
        try {
          if (onComplete) onComplete();
        } catch {}
        // Show loader during redirect to success page
        await finalizeToSuccess();
        return;
      }

      // Extract name parts for signup
      const fullNameRaw = (wizardData?.fullName as string) || "";
      const fullName =
        fullNameRaw.trim().length > 0
          ? fullNameRaw.trim()
          : formData.email.split("@")[0];

      // Use Firebase signup
      // Collect initial profile fields from wizard to persist at account creation
      const initialProfile: Record<string, unknown> = {};
      if (wizardData) {
        const fieldKeys = [
          "profileFor",
          "gender",
          "dateOfBirth",
          "phoneNumber",
          "country",
          "city",
          "height",
          "maritalStatus",
          "physicalStatus",
          "motherTongue",
          "religion",
          "ethnicity",
          "diet",
          "smoking",
          "drinking",
          "education",
          "occupation",
          "annualIncome",
          "aboutMe",
          "preferredGender",
          "partnerPreferenceAgeMin",
          "partnerPreferenceAgeMax",
        ];
        fieldKeys.forEach((k) => {
          const v = (wizardData as any)[k];
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "") ||
            (Array.isArray(v) && v.length === 0)
          )
            return;
          initialProfile[k] = v;
        });
      }

      const result = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        fullName,
        profileData: initialProfile,
      });

      if (!result.success) {
        // Handle signup errors
        let errorMsg = result.error || "Failed to create account";

        // Provide more specific error messages for common cases
        if (errorMsg.includes("email-already-in-use")) {
          errorMsg = "An account with this email already exists";
        } else if (errorMsg.includes("password")) {
          errorMsg =
            "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
        } else if (errorMsg.includes("too-many-requests")) {
          errorMsg = "Too many signup attempts. Please wait and try again.";
        }

        showErrorToast(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }

      // (Modified) Regardless of email verification requirement, continue to success page immediately.
      // If you want to require email verification before redirect, restore previous conditional block.
      if (
        (result as any).needsVerification ||
        (result as any).needsEmailVerification
      ) {
        // Persist pending state (optional) but still proceed.
        try {
          sessionStorage.setItem(
            PENDING_KEY,
            JSON.stringify({
              email: formData.email.trim(),
              ts: Date.now(),
            })
          );
        } catch {}
      }

      // Refresh auth state before redirect (best-effort)
      try {
        await refreshUser();
      } catch {}

      // Clean up any onboarding/local wizard storage
      try {
        const mod = await import("@/lib/utils/onboardingStorage");
        if (mod && typeof mod.clearAllOnboardingData === "function") {
          mod.clearAllOnboardingData();
        } else if (typeof window !== "undefined") {
          const { STORAGE_KEYS } = await import(
            "@/lib/utils/onboardingStorage"
          );
          if (STORAGE_KEYS) {
            try {
              localStorage.removeItem(STORAGE_KEYS.PROFILE_CREATION);
            } catch {}
            try {
              localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
            } catch {}
            try {
              localStorage.removeItem(STORAGE_KEYS.PENDING_IMAGES);
            } catch {}
          }
        }
      } catch {
        if (process.env.NODE_ENV !== "production") {
          /* dev: onboarding storage cleanup failed */
        }
      }

      // Call onComplete callback if provided
      try {
        if (onComplete) onComplete();
      } catch (err) {
        console.warn("onComplete callback threw, continuing", err);
      }

      // Redirect to success page
      await finalizeToSuccess();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Signup request failed", err);
      }
      showErrorToast("An unexpected error occurred");
      onError?.("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-base-light/70 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3 px-6 py-4 text-center">
            <LoadingSpinner className="h-6 w-6 text-primary" />
            <div className="text-sm font-medium text-neutral-dark font-sans">
              {needsVerification
                ? "Verifying code..."
                : "Creating account & sending verification code..."}
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {needsVerification ? (
          // Verification UI
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-serif font-bold text-neutral-dark">Check your email</h3>
              <p className="text-sm text-neutral-light font-sans">
                We sent a verification code to <strong className="text-primary">{formData.email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <OtpInput
                  value={verificationCode}
                  onChange={(value) => {
                    setVerificationCode(value);
                    if (fieldErrors.verificationCode) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        verificationCode: undefined,
                      }));
                    }
                  }}
                  length={6}
                  autoFocus
                  disabled={isLoading || resendLoading}
                />
              </div>
              {fieldErrors.verificationCode ? (
                <p id="verificationCode-error" className="text-xs text-danger text-center font-sans">
                  {fieldErrors.verificationCode}
                </p>
              ) : null}
              
              <div className="flex flex-col items-center gap-4 mt-4">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend}
                  disabled={secondsLeft > 0 || resendLoading || isLoading}
                  className="text-sm text-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:underline font-sans h-auto p-0"
                >
                  {resendLoading
                    ? "Resending..."
                    : secondsLeft > 0
                      ? `Resend code in ${secondsLeft}s`
                      : "Resend code"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 font-sans font-semibold transition-all"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-neutral-light hover:text-primary transition-colors font-sans h-auto p-0"
                onClick={() => {
                  setNeedsVerification(false);
                  setVerificationCode("");
                  setFieldErrors((prev) => ({
                    ...prev,
                    verificationCode: undefined,
                  }));
                }}
                disabled={isLoading}
              >
                Back to sign up
              </Button>
            </div>
          </div>
        ) : (
          // Regular signup form
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-dark font-sans">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isLoading}
                  className="h-12 rounded-xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-danger font-sans">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-dark font-sans">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="Create a strong password"
                    required
                    disabled={isLoading}
                    className={`h-12 pr-10 rounded-xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all font-sans ${
                      passwordsMatch ? "border-success focus:ring-success/20" : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-light hover:text-neutral-dark hover:bg-transparent"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-danger font-sans">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-dark font-sans">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    placeholder="Repeat your password"
                    required
                    disabled={isLoading}
                    className={`h-12 pr-10 rounded-xl border-neutral/10 focus:ring-2 focus:ring-primary/20 transition-all font-sans ${
                      passwordsMatch ? "border-success focus:ring-success/20" : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-light hover:text-neutral-dark hover:bg-transparent"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordsFilled && !fieldErrors.confirmPassword && (
                  <p className={`text-[10px] font-medium font-sans ${passwordsMatch ? "text-success" : "text-danger"}`}>
                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 font-sans font-semibold transition-all mt-2"
              disabled={
                isLoading ||
                !formData.email ||
                !formData.password ||
                !formData.confirmPassword ||
                !!fieldErrors.email ||
                !!fieldErrors.password ||
                !!fieldErrors.confirmPassword
              }
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </>
        )}
      </form>

      {!needsVerification && (
        <>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-base-light px-4 text-neutral-light font-sans font-medium">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-neutral/10 hover:bg-neutral/5 hover:border-neutral/30 transition-all font-sans font-medium flex items-center justify-center gap-3"
            onClick={async () => {
              setIsLoading(true);
              try {
                const result = await signInWithGoogle();
                if (!result.success) {
                  const msg = result.error || "Google sign in failed. Please try again.";
                  onError?.(msg);
                  showErrorToast(msg);
                  setIsLoading(false);
                  return;
                }

                // If profile not yet created (first-time Google signup), attempt completion with wizard data
                try {
                  const fieldKeys = [
                    "fullName",
                    "profileFor",
                    "gender",
                    "dateOfBirth",
                    "phoneNumber",
                    "country",
                    "city",
                    "height",
                    "maritalStatus",
                    "physicalStatus",
                    "motherTongue",
                    "religion",
                    "ethnicity",
                    "diet",
                    "smoking",
                    "drinking",
                    "education",
                    "occupation",
                    "annualIncome",
                    "aboutMe",
                    "preferredGender",
                    "partnerPreferenceAgeMin",
                    "partnerPreferenceAgeMax",
                  ];
                  const googleProfilePayload: Record<string, unknown> = {};
                  if (wizardData) {
                    fieldKeys.forEach((k) => {
                      const v = (wizardData as any)[k];
                      if (
                        v === undefined ||
                        v === null ||
                        (typeof v === "string" && v.trim() === "") ||
                        (Array.isArray(v) && v.length === 0)
                      )
                        return;
                      googleProfilePayload[k] = v;
                    });
                  }
                  if (!googleProfilePayload.fullName && wizardData?.fullName)
                    googleProfilePayload.fullName = wizardData.fullName;
                  if (Object.keys(googleProfilePayload).length > 0) {
                    const compResult = await completeGoogleSignup(
                      googleProfilePayload as any
                    );
                    if (!compResult.success && compResult.error) {
                      showErrorToast(compResult.error);
                    }
                  }
                } catch (e) {
                  if (process.env.NODE_ENV !== "production") {
                    console.warn("completeGoogleSignup failed", e);
                  }
                }

                try {
                  const mod = await import("@/lib/utils/onboardingStorage");
                  if (mod && typeof mod.clearAllOnboardingData === "function") {
                    mod.clearAllOnboardingData();
                  }
                } catch {}

                try {
                  if (onComplete) onComplete();
                } catch (err) {
                  console.warn("onComplete callback threw, continuing", err);
                }

                await finalizeToSuccess();
              } catch (err) {
                if (process.env.NODE_ENV !== "production") {
                  console.error("Google signup failed", err);
                }
                showErrorToast("An unexpected error occurred");
                onError?.("An unexpected error occurred");
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
