"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, refreshUser, user, signInWithGoogleExistingOnly } =
    useFirebaseAuth();
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
      // 1) Perform sign in
      const result = await signIn({ email, password });
      if (!result.success) {
        const msg = result.error || "Sign in failed. Please try again.";
        onError?.(msg);
        showErrorToast(msg);
        setIsLoading(false);
        return;
      }

      // Show success message
      showSuccessToast("Welcome back! You have been successfully signed in.");

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
    } catch {
      const msg =
        "An unexpected error occurred. Please try again in a few minutes.";
      onError?.(msg);
      showErrorToast(msg);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogleExistingOnly();
      if (!result.success) {
        const msg = result.error || "Google sign in failed. Please try again.";
        onError?.(msg);
        showErrorToast(msg);
        setIsLoading(false);
        return;
      }

      // Show success message
      showSuccessToast("Welcome back! You have been successfully signed in.");

      // Proceed to onboarding completion
      handleOnboardingComplete();
      setIsLoading(false);
    } catch {
      const msg =
        "An unexpected error occurred. Please try again in a few minutes.";
      onError?.(msg);
      showErrorToast(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative" data-testid="custom-sign-in-form">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-base/70 backdrop-blur-sm rounded-md">
          <div className="flex flex-col items-center gap-3 px-6 py-4 text-center">
            <LoadingSpinner className="h-5 w-5" />
            <div className="text-sm text-neutral">Signing in...</div>
          </div>
        </div>
      )}
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-neutral transition-colors"
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
          <span className="bg-base px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Signing in...
          </>
        ) : (
          "Sign in with Google"
        )}
      </Button>

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
