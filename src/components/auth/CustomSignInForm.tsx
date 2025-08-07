"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import GoogleAuthButton from "./GoogleAuthButton";
import { showErrorToast } from "@/lib/ui/toast";
import { authFetch } from "@/lib/api/authClient";

interface CustomSignInFormProps {
  onComplete?: () => void;
}

export default function CustomSignInForm({
  onComplete,
}: CustomSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect_url") || "/search";

  // Unified onboarding completion handler
  const handleOnboardingComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push(redirectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Invoke existing auth flow (which hits /api/auth/signin under the hood)
      const result = await signIn(email, password);

      // Explicitly call /api/auth/me to log correlation/debug headers for visibility
      try {
        await authFetch("/api/auth/me", { method: "GET" });
      } catch {
        // ignore logging failures; UI behavior below still applies
      }

      if (result.success) {
        // Check for profile existence
        setTimeout(() => {
          const hasProfile = user && user.profile && (user.profile as any).id;
          if (!hasProfile) {
            showErrorToast(
              "No profile found for this account. Please create a profile first."
            );
            setIsLoading(false);
            return;
          }
          handleOnboardingComplete();
        }, 100);
      } else {
        showErrorToast(result.error || "Sign in failed");
        setIsLoading(false);
      }
    } catch (err) {
      showErrorToast("An unexpected error occurred");
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Signing in...
            </>
          ) : (
            "Sign In"
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
        onSuccess={handleOnboardingComplete}
        onError={(error: string) => showErrorToast(error)}
      />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">
          Don&apos;t have an account?{" "}
        </span>
        <button
          type="button"
          onClick={() => router.push("/sign-up")}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
