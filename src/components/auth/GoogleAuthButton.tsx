"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function GoogleAuthButton({
  onSuccess,
  onError,
  disabled = false,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);
  const { signInWithGoogle } = useAuth();

  // Load Google Identity Services script and initialize once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).google && !initializedRef.current) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            if (!response?.credential) return;
            setIsLoading(true);
            const result = await signInWithGoogle(response.credential);
            if (result.success) {
              onSuccess?.();
            } else {
              onError?.(result.error || "Google sign in failed");
            }
            setIsLoading(false);
          },
        });
        initializedRef.current = true;
      } catch (e) {
        console.error("Google init error", e);
      }
    }
  }, [signInWithGoogle, onSuccess, onError]);

  const handleGoogleSignIn = async () => {
    if (!(window as any).google || !initializedRef.current) {
      onError?.("Google script not loaded");
      return;
    }

    try {
      // Trigger the Google sign-in prompt using FedCM when supported
      (window as any).google.accounts.id.prompt(undefined, {
        use_fedcm_for_prompt: true,
      });
    } catch (e) {
      console.error("Google prompt error", e);
      onError?.("Google sign in failed");
    }
  };

  return (
    <>
      {/* Load Google Identity Services script once */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          // The useEffect will handle initialization
        }}
      />
      <Button
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full flex items-center gap-2"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="h-4 w-4" />
            Signing in with Google...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
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
