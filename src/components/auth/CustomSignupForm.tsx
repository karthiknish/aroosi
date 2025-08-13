"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import { useClerkAuth as useAuth } from "@/components/ClerkAuthProvider"; // Add this import
import { Eye, EyeOff } from "lucide-react";
import { showErrorToast } from "@/lib/ui/toast";
import { OtpInput } from "@/components/ui/otp-input";

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
  const [signUpAttemptId, setSignUpAttemptId] = useState<string | null>(null);
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
  const { signUp, refreshUser, verifyEmailCode, resendEmailVerification } =
    useAuth(); // include verification

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

  // Rehydrate pending verification on mount
  useEffect(() => {
    try {
      if (needsVerification) return; // already active
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        email: string;
        attemptId: string;
        ts: number;
      } | null;
      if (!parsed) return;
      // expire after 15 minutes
      if (Date.now() - parsed.ts > 15 * 60 * 1000) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }
      setNeedsVerification(true);
      setSignUpAttemptId(parsed.attemptId);
      if (!formData.email) {
        setFormData((prev) => ({ ...prev, email: parsed.email }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (!signUpAttemptId || secondsLeft > 0) return;
    setResendLoading(true);
    try {
      const resp = await resendEmailVerification(signUpAttemptId);
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

  // Auto-submit when full 6-digit code entered
  const autoSubmittingRef = useRef(false);
  useEffect(() => {
    const shouldAutoSubmit =
      needsVerification &&
      signUpAttemptId &&
      verificationCode.length === 6 &&
      !isLoading &&
      !autoSubmittingRef.current;
    if (!shouldAutoSubmit) return;
    autoSubmittingRef.current = true;
    const run = async () => {
      setIsLoading(true);
      try {
        const result = await verifyEmailCode(verificationCode, signUpAttemptId);
        if (!result.success)
          throw new Error(result.error || "Failed to verify code");

        await refreshUser();
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
        const redirectTo = "/success";
        try {
          router.push(redirectTo);
        } catch {
          window.location.href = redirectTo;
        }
      } catch (err: any) {
        const msg =
          err?.message || "Invalid verification code. Please try again.";
        showErrorToast(msg);
        onError?.(msg);
        autoSubmittingRef.current = false; // allow retry
        setIsLoading(false);
      }
    };
    void run();
  }, [
    needsVerification,
    signUpAttemptId,
    verificationCode,
    isLoading,
    refreshUser,
    onComplete,
    onError,
    router,
    formData.email,
  ]);

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
      if (needsVerification && signUpAttemptId) {
        try {
          const result = await verifyEmailCode(
            verificationCode,
            signUpAttemptId
          );
          if (!result.success)
            throw new Error(result.error || "Failed to verify code");

          // Success flow after verification
          await refreshUser();
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
          const redirectTo = "/success";
          try {
            router.push(redirectTo);
          } catch {
            window.location.href = redirectTo;
          }
          return;
        } catch (verifyError: any) {
          const errorMsg =
            verifyError?.message ||
            "Invalid verification code. Please try again.";
          showErrorToast(errorMsg);
          onError?.(errorMsg);
          setIsLoading(false);
          return;
        }
      }

      // Extract name parts for Clerk signup
      const fullNameRaw = (wizardData?.fullName as string) || "";
      const fullName =
        fullNameRaw.trim().length > 0
          ? fullNameRaw.trim()
          : formData.email.split("@")[0];

      // Use Clerk signup instead of direct API call
      const result = await signUp(
        formData.email.trim(),
        formData.password,
        fullName
      );

      // Add debugging logs
      if (process.env.NODE_ENV !== "production") {
        console.log("SignUp result:", result);
      }

      if (!result.success) {
        // Handle signup errors
        let errorMsg = result.error || "Failed to create account";

        // Check if this is a verification required error
        if (result.needsVerification) {
          setNeedsVerification(true);
          setSignUpAttemptId(result.signUpAttemptId || null);
          try {
            if (result.signUpAttemptId) {
              sessionStorage.setItem(
                PENDING_KEY,
                JSON.stringify({
                  email: formData.email.trim(),
                  attemptId: result.signUpAttemptId,
                  ts: Date.now(),
                })
              );
            }
          } catch {}
          setIsLoading(false);
          return;
        }

        // Provide more specific error messages for common cases
        if (errorMsg.includes("identifier_exists")) {
          errorMsg = "An account with this email already exists";
        } else if (errorMsg.includes("password")) {
          errorMsg =
            "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
        } else if (errorMsg.includes("too_many_requests")) {
          errorMsg = "Too many signup attempts. Please wait and try again.";
        }

        showErrorToast(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }

      // Success: Cookie-based session; refresh the auth state to reflect the new session
      if (process.env.NODE_ENV !== "production") {
        /* dev: signup success */
      }
      await refreshUser();

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
        console.warn("onComplete callback threw, continuing navigation", err);
      }

      // Navigate to success page
      const redirectTo = "/success";

      if (process.env.NODE_ENV !== "production") {
        /* dev: navigating */
      }
      try {
        router.push(redirectTo);
      } catch {
        window.location.href = redirectTo;
      }
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
    <div className="space-y-6">
      {process.env.NODE_ENV !== "production" && (
        <div>needsVerification: {needsVerification ? "true" : "false"}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {needsVerification ? (
          // Verification UI
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium">Check your email</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a verification code to <strong>{formData.email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <OtpInput
                value={verificationCode}
                onChange={(value) => {
                  setVerificationCode(value);
                  // Clear error when user starts typing
                  if (fieldErrors.verificationCode) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      verificationCode: undefined,
                    }));
                  }
                }}
                length={6}
                disabled={isLoading}
                autoFocus
              />
              {fieldErrors.verificationCode ? (
                <p id="verificationCode-error" className="text-xs text-red-600">
                  {fieldErrors.verificationCode}
                </p>
              ) : null}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={secondsLeft > 0 || resendLoading}
                  className="text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:underline"
                >
                  {resendLoading
                    ? "Resending..."
                    : secondsLeft > 0
                      ? `Resend code in ${secondsLeft}s`
                      : "Resend code"}
                </button>
                <span>
                  {verificationCode.length === 6
                    ? "Ready to verify"
                    : "Enter the 6-digit code"}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
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

            <div className="text-center text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  setNeedsVerification(false);
                  setVerificationCode("");
                  setFieldErrors((prev) => ({
                    ...prev,
                    verificationCode: undefined,
                  }));
                }}
              >
                Back to sign up
              </button>
            </div>
          </div>
        ) : (
          // Regular signup form
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email ? (
                <p id="email-error" className="text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                  className={`pr-10 ${
                    passwordsMatch
                      ? "border-green-500 focus-visible:ring-green-500"
                      : fieldErrors.password
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="password-error" className="text-xs text-red-600 mt-1">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? "confirmPassword-error"
                      : undefined
                  }
                  className={`pr-10 ${
                    passwordsMatch
                      ? "border-green-500 focus-visible:ring-green-500"
                      : fieldErrors.confirmPassword
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordsFilled && !fieldErrors.confirmPassword ? (
                <p
                  className={`text-xs mt-1 ${
                    passwordsMatch ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              ) : null}
              {fieldErrors.confirmPassword ? (
                <p
                  id="confirmPassword-error"
                  className="text-xs text-red-600 mt-1"
                >
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full"
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
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>

            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <GoogleAuthButton
            redirectUrlComplete="/success"
            onSuccess={() => {
              if (onComplete) {
                onComplete();
              } else {
                router.push("/profile/create");
              }
            }}
            onError={(error: string) => showErrorToast(error)}
            className="w-full"
          />
        </>
      )}
    </div>
  );
}
