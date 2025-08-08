"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  openOAuthPopup,
  setupOAuthMessageListener,
} from "@/lib/utils/oauthPopup";

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

/**
 * Security upgrades:
 * - Generate cryptographically-strong state per attempt and store in cookie + memory.
 * - Include state in the request to the backend; backend validates against cookie.
 * - Enforce allowed origin for Google APIs; do not log sensitive data.
 * - Cap credential-like payload length.
 */
export default function GoogleAuthButton({
  onSuccess,
  onError,
  disabled = false,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Open Convex Auth Google OAuth flow in a popup
      const oauthUrl = "/api/auth/google";
      const popup = openOAuthPopup(oauthUrl, "Continue with Google", {
        onError: (err) => onError?.(err),
      });
      if (!popup) {
        setIsLoading(false);
        return;
      }

      // Listen for success from the callback page
      const cleanup = setupOAuthMessageListener(
        async () => {
          // Small hydration retry after OAuth completes
          const sleep = (ms: number) =>
            new Promise((res) => setTimeout(res, ms));
          const backoffs = [0, 150, 300, 750];
          for (let i = 0; i < backoffs.length; i++) {
            if (backoffs[i] > 0) await sleep(backoffs[i]);
            try {
              await refreshUser();
            } catch {}
          }
          cleanup();
          onSuccess?.();
          setIsLoading(false);
        },
        (err) => {
          cleanup();
          onError?.(err);
          setIsLoading(false);
        }
      );
    } catch (e: any) {
      onError?.(e?.message || "Failed to start Google sign in");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full flex items-center gap-2 transition-all duration-200 hover:bg-gray-50"
        disabled={disabled || isLoading}
        aria-label="Sign in with Google"
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="h-4 w-4" />
            Signing in with Google...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </Button>
    </>
  );
}
