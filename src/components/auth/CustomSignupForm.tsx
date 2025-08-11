"use client";

import { useState } from "react";
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

  // Toggle visibility for password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline error state for precise field-level feedback
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  // Derived validation state
  const passwordsFilled =
    formData.password.length > 0 && formData.confirmPassword.length > 0;
  const passwordsMatch =
    formData.password === formData.confirmPassword && passwordsFilled;

  // Access wizard data to derive full name and profile fields
  const { formData: wizardData } = useProfileWizard();
  const { signUp, refreshUser } = useAuth(); // Update auth context

  const router = useRouter();

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
      // Also show a compact toast for visibility
      const first =
        nextErrors.email || nextErrors.password || nextErrors.confirmPassword;
      if (first) {
        showErrorToast(first);
        onError?.(first);
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Extract name parts for Clerk signup
      const fullNameRaw = (wizardData?.fullName as string) || "";
      const fullName = fullNameRaw.trim().length > 0 ? fullNameRaw.trim() : formData.email.split("@")[0];
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Use Clerk signup instead of direct API call
      const result = await signUp(
        formData.email.trim(),
        formData.password,
        firstName,
        lastName
      );

      if (!result.success) {
        // Handle signup errors
        let errorMsg = result.error || "Failed to create account";
        
        // Provide more specific error messages for common cases
        if (errorMsg.includes("identifier_exists")) {
          errorMsg = "An account with this email already exists";
        } else if (errorMsg.includes("password")) {
          errorMsg = "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(e) => handleInputChange("password", e.target.value)}
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
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          ) : null}
          {fieldErrors.confirmPassword ? (
            <p id="confirmPassword-error" className="text-xs text-red-600 mt-1">
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
      </form>

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
      />
    </div>
  );
}
