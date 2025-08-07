"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAuthContext } from "@/components/AuthProvider";
import CustomSignInForm from "@/components/auth/CustomSignInForm";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const {
    isProfileComplete,
    isOnboardingComplete,
    isAuthenticated,
    isLoaded,
    refreshUser,
  } = useAuthContext();

  const router = useRouter();

  // UI-local error message injected into the form container
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  // Expose setter so child can report errors without prop drilling deeper wrappers
  React.useEffect(() => {
    (window as any).__signin_setErr = setErrorMessage;
    return () => {
      try {
        delete (window as any).__signin_setErr;
      } catch {}
    };
  }, []);

  // Compute redirect only after auth state is loaded and authenticated
  // Redirect to /search after sign-in; do NOT send to "/" (home) anymore
  const isTrulyAuthenticated = isAuthenticated;
  const finalRedirect = "/search";

  // Only redirect when actually authenticated and state has loaded.
  // Additionally: On mount, if an old authTokenPublic or legacy token exists in JS context,
  // let the server drive auth via cookies by always calling /api/auth/me before redirecting.
  React.useEffect(() => {
    let cancelled = false;
    const go = async () => {
      if (!isLoaded) return;
      if (!isTrulyAuthenticated) return;

      // Force a server truth check that also forwards Set-Cookie if refresh was needed.
      // This ensures cookie auth is the source of truth and avoids relying on any legacy public token.
      try {
        const resp = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "cache-control": "no-store",
            accept: "application/json",
          },
          credentials: "include",
        });

        if (!resp.ok) {
          // If session is invalid or refresh was reused, route to sign-in (we are already here) and reset state
          // The AuthProvider should observe cookie changes; we just avoid redirecting forward.
          return;
        }

        // Proceed to final redirect once server confirms valid session
        if (!cancelled) {
          router.push(finalRedirect);
        }
      } catch {
        // Ignore network errors; stay on sign-in page
      }
    };
    void go();
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isAuthenticated,
    isProfileComplete,
    isOnboardingComplete,
    finalRedirect,
    router,
  ]);

  return (
    <div className="min-h-screen w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
      {/* Decorative color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")`,
        }}
      ></div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Sign In
            </h1>
            {/* Pink wavy SVG underline */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-xl p-8"
        >
          {/* Inline server error display */}
          {/* Error message will be injected via state managed here */}
          {/* See state hook added below */}
          {/* Always show sign-in form for maximum safety.
             If a valid session exists, the effect above will redirect quickly. */}
          <CustomSignInForm
            onComplete={async () => {
              // After successful sign-in, rely on cookies. Call /api/auth/me to ensure
              // any Set-Cookie from refresh or issuance is fully applied, then redirect.
              try {
                await fetch("/api/auth/me", {
                  method: "GET",
                  headers: {
                    accept: "application/json",
                    "cache-control": "no-store",
                  },
                  credentials: "include",
                });
              } catch {
                // ignore
              }
              // Clear any prior error on success
              try {
                // no-op if state not present yet
                (window as any).__signin_setErr?.(null);
              } catch {}
              router.push("/search");
            }}
            onError={(msg) => {
              try {
                (window as any).__signin_setErr?.(msg || "Sign in failed");
              } catch {}
            }}
          />
          <p className="text-center text-sm mt-4">
            <a
              href="/forgot-password"
              className="text-pink-600 hover:text-pink-700 underline"
            >
              Forgot password?
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
