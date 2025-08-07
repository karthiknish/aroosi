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


interface CustomSignInFormProps {
  onComplete?: () => void;
  onError?: (message: string) => void;
}

export default function CustomSignInForm({
  onComplete,
  onError,
}: CustomSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, refreshUser, user } = useAuth();
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

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1) Perform sign in (cookie-based session)
      const result = await signIn(email, password);
      if (!result.success) {
        const msg = result.error || "Sign in failed";
        onError?.(msg);
        showErrorToast(msg);
        setIsLoading(false);
        return;
      }
  
      // 2) Hydration retry loop to cover propagation delay after sign-in
      const backoffs = [0, 150, 300, 750];
      let hydratedUser: any = null;
  
      for (let i = 0; i < backoffs.length; i++) {
        if (backoffs[i] > 0) {
          await sleep(backoffs[i]);
        }
        try {
          await refreshUser();
        } catch {
          // ignore, allow next retry
        }
  
        // Optional: warm up /api/auth/me (non-blocking, relies on cookies)
        void fetch("/api/auth/me", {
          method: "GET",
          headers: { accept: "application/json", "cache-control": "no-store" },
        }).catch(() => {});
  
        hydratedUser = (user as any) ?? null;
        if (
          hydratedUser &&
          (hydratedUser.profile?.id ||
            hydratedUser.profile?._id ||
            hydratedUser.id)
        ) {
          break;
        }
      }
  
      // Proceed regardless; downstream guards handle profile completion
      handleOnboardingComplete();
      setIsLoading(false);
    } catch (err) {
      const msg = "An unexpected error occurred";
      onError?.(msg);
      showErrorToast(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="custom-sign-in-form">
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
          onClick={() => router.push("/sign-in")}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
