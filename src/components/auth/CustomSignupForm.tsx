"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import GoogleAuthButton from "./GoogleAuthButton";
import { useProfileWizard } from "@/contexts/ProfileWizardContext";
import { useAuth } from "@/components/AuthProvider"; // Add this import
import { Eye, EyeOff } from "lucide-react";
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

  // Toggle visibility for password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Derived validation state
  const passwordsFilled =
    formData.password.length > 0 && formData.confirmPassword.length > 0;
  const passwordsMatch =
    formData.password === formData.confirmPassword && passwordsFilled;

  // Access wizard data to derive full name and profile fields
  const { formData: wizardData } = useProfileWizard();
  const { refreshUser } = useAuth(); // Add auth context

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
      // Build fullName from wizard or fallback to email local part
      const fullNameRaw = (wizardData?.fullName as string) || "";
      const fullName =
        fullNameRaw.trim().length > 0
          ? fullNameRaw.trim()
          : formData.email.split("@")[0];

      // Construct a minimally viable profile expected by the server schema
      const normalizeGender = (g?: unknown): "male" | "female" | "other" => {
        const s = String(g ?? "").toLowerCase();
        if (s === "male" || s === "female" || s === "other") return s as any;
        return "other";
      };
      const normalizeMarital = (
        m?: unknown
      ): "single" | "divorced" | "widowed" | "annulled" => {
        const s = String(m ?? "").toLowerCase();
        if (
          s === "single" ||
          s === "divorced" ||
          s === "widowed" ||
          s === "annulled"
        )
          return s as any;
        return "single";
      };
      const normalizedHeight =
        typeof (wizardData as any)?.height === "string" &&
        ((wizardData as any)?.height as string).trim().length > 0
          ? ((wizardData as any)?.height as string).trim()
          : "170 cm";

      const cityFromWizard = ((wizardData as any)?.city as string) || "";
      const city = cityFromWizard.trim();

      const normalizedProfile = {
        fullName,
        email: formData.email.trim(),
        dateOfBirth:
          ((wizardData as any)?.dateOfBirth as string) || "1990-01-01",
        gender: normalizeGender((wizardData as any)?.gender),
        city: city || "Kabul",
        aboutMe: ((wizardData as any)?.aboutMe as string) || "Hello!",
        occupation:
          ((wizardData as any)?.occupation as string) || "Not specified",
        education:
          ((wizardData as any)?.education as string) || "Not specified",
        height: normalizedHeight,
        maritalStatus: normalizeMarital((wizardData as any)?.maritalStatus),
        phoneNumber:
          ((wizardData as any)?.phoneNumber as string) || "+10000000000",

        // Optional fields passed through when available
        country: (wizardData as any)?.country ?? undefined,
        annualIncome: (wizardData as any)?.annualIncome ?? undefined,
        preferredGender: (wizardData as any)?.preferredGender ?? undefined,
        motherTongue: (wizardData as any)?.motherTongue ?? undefined,
        religion: (wizardData as any)?.religion ?? undefined,
        ethnicity: (wizardData as any)?.ethnicity ?? undefined,
        physicalStatus: (wizardData as any)?.physicalStatus ?? undefined,
        smoking: (wizardData as any)?.smoking ?? undefined,
        drinking: (wizardData as any)?.drinking ?? undefined,
        partnerPreferenceAgeMin:
          (wizardData as any)?.partnerPreferenceAgeMin ?? undefined,
        partnerPreferenceAgeMax:
          (wizardData as any)?.partnerPreferenceAgeMax ?? undefined,
        partnerPreferenceCity: Array.isArray(
          (wizardData as any)?.partnerPreferenceCity
        )
          ? ((wizardData as any)?.partnerPreferenceCity as string[])
          : [],
        profileFor: (wizardData as any)?.profileFor ?? "self",
        profileImageIds: Array.isArray((wizardData as any)?.profileImageIds)
          ? ((wizardData as any)?.profileImageIds as string[])
          : [],
      };

      console.log("CustomSignupForm: Signup payload preview", {
        keys: Object.keys({
          email: formData.email,
          password: formData.password,
          fullName,
          profile: normalizedProfile,
        }),
        profileKeys: Object.keys(normalizedProfile || {}),
      });

      // POST to unified signup route which atomically creates user+profile in Convex
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          fullName,
          profile: normalizedProfile,
        }),
      });

      const data = await res.json().catch(() => ({}) as unknown);

      if (res.status === 409) {
        // Conflict: user already exists
        const msg =
          (data as any)?.error ||
          (data as any)?.message ||
          "An account with this email already exists";
        showErrorToast(msg);
        setIsLoading(false);
        return;
      }
      
      if (res.status === 400) {
        // Bad Request: show precise, user-friendly errors
        let userMsg = "We couldn't create your account.";
        const raw = data as any;
        

        // 1) Explicit "Profile incomplete" from server gate
        if (
          raw?.error &&
          String(raw.error).toLowerCase().includes("profile incomplete")
        ) {
          const fields: string[] = Array.isArray(raw.details)
            ? raw.details
            : [];
          if (fields.length > 0) {
            userMsg = `Please complete: ${fields.slice(0, 6).join(", ")}${fields.length > 6 ? " and more" : ""}.`;
          } else {
            userMsg =
              "Your profile is missing required information. Please complete all fields and try again.";
          }
          showErrorToast(userMsg);
          setIsLoading(false);
          return;
        }

        // 2) Zod validation errors shape { details: [{ path, message } ...] }
        if (Array.isArray(raw?.details) && raw.details.length > 0) {
          const fields = raw.details
            .map((d: any) => d?.path?.join("."))
            .filter(Boolean);
          const messages = raw.details
            .map((d: any) =>
              typeof d?.message === "string" ? d.message : null
            )
            .filter(Boolean);

          if (fields.length > 0) {
            userMsg = `Invalid or missing: ${fields.slice(0, 6).join(", ")}${fields.length > 6 ? " and more" : ""}.`;
          } else if (messages.length > 0) {
            userMsg = messages.slice(0, 2).join(" • ");
          } else {
            userMsg =
              "Invalid input data. Please review your details and try again.";
          }
          showErrorToast(userMsg);
          setIsLoading(false);
          return;
        }

        // 3) Generic 400 with message
        if (typeof raw?.message === "string") {
          showErrorToast(raw.message);
          setIsLoading(false);
          return;
        }

        showErrorToast(
          "We couldn't create your account. Please review your details and try again."
        );
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const raw = data as any;
        const msg =
          raw?.error ||
          raw?.message ||
          (typeof raw === "string" ? raw : null) ||
          "Failed to create account";
        showErrorToast(msg);
        setIsLoading(false);
        return;
      }

      // Success: The signup API now sets cookies, so we need to refresh auth state
      console.log("CustomSignupForm: Signup successful, refreshing auth state");

      // IMPORTANT: Refresh the auth state to pick up the new session
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
      } catch (e) {
        console.warn("Onboarding storage cleanup failed (non-fatal):", e);
      }

      // Call onComplete callback if provided
      try {
        if (onComplete) onComplete();
      } catch (err) {
        console.warn("onComplete callback threw, continuing navigation", err);
      }

      // Navigate to success page
      const redirectTo =
        typeof (data as any)?.redirectTo === "string" &&
        (data as any).redirectTo
          ? (data as any).redirectTo
          : "/success";

      console.log("CustomSignupForm: Navigating to:", redirectTo);
      try {
        router.push(redirectTo);
      } catch {
        window.location.href = redirectTo;
      }
    } catch (err) {
      console.error("Signup request failed", err);
      showErrorToast("An unexpected error occurred");
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
              className={`pr-10 ${
                passwordsMatch
                  ? "border-green-500 focus-visible:ring-green-500"
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
              className={`pr-10 ${
                passwordsMatch
                  ? "border-green-500 focus-visible:ring-green-500"
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
          {passwordsFilled && (
            <p
              className={`text-xs mt-1 ${
                passwordsMatch ? "text-green-600" : "text-red-600"
              }`}
            >
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
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
