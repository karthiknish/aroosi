"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import GoogleAuthButton from "./GoogleAuthButton";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import { Eye, EyeOff } from "lucide-react";
import { OtpInput } from "@/components/ui/otp-input";
import { showErrorToast } from "@/lib/ui/toast";

interface CustomSignupFormProps {
  onComplete?: () => void;
}

export default function CustomSignupForm({
  onComplete,
}: CustomSignupFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otp, setOtp] = useState("");

  // Toggle visibility for password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Access wizard data to derive names
  const { formData: wizardData } = useProfileWizard();

  const { signUp, verifyOTP } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      showErrorToast("Email is required");
      return false;
    }
    if (!formData.password) {
      showErrorToast("Password is required");
      return false;
    }
    if (formData.password.length < 8) {
      showErrorToast("Password must be at least 8 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showErrorToast("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Derive first and last name from the wizard's fullName (if available)
      const fullName = (wizardData?.fullName as string) || "";
      const [derivedFirstName, ...derivedRest] = fullName.trim().split(" ");
      const derivedLastName = derivedRest.join(" ");

      const result = await signUp(
        formData.email,
        formData.password,
        derivedFirstName || "N/A",
        derivedLastName || "N/A"
      );

      if (result.success) {
        setShowOTPForm(true);
      } else {
        showErrorToast(result.error || "Sign up failed");
      }
    } catch (err) {
      showErrorToast("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Unified onboarding completion handler
  const handleOnboardingComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push("/profile/create");
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await verifyOTP(formData.email, otp.trim());
      if (result.success) {
        handleOnboardingComplete();
      } else {
        showErrorToast(result.error || "OTP verification failed");
      }
    } catch (err) {
      showErrorToast("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (showOTPForm) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
          <p className="text-sm text-muted-foreground">
            We've sent a verification code to {formData.email}
          </p>
        </div>

        <form onSubmit={handleOTPSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <OtpInput
              value={otp}
              onChange={(value) => setOtp(value)}
              length={6}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !otp}>
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setShowOTPForm(false)}
            className="text-primary hover:underline"
          >
            Back to sign up
          </button>
        </div>
      </div>
    );
  }

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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Create a password (min. 8 characters)"
              required
              disabled={isLoading}
              className="pr-10"
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
              className="pr-10"
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
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            isLoading ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword
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
