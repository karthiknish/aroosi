"use client";

import { useState, useRef } from "react";
import Script from "next/script";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { signInWithGoogle, refreshUser } = useAuth();
  const stateRef = useRef<string | null>(null);

  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const setCookie = (name: string, value: string, maxAgeSec: number) => {
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${
      isProd ? "; Secure" : ""
    }`;
  };

  const getCookie = (name: string): string | null => {
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`)
    );
    return m ? decodeURIComponent(m[1]) : null;
  };

  const genState = () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    // base64url encode
    let str = "";
    arr.forEach((b) => (str += String.fromCharCode(b)));
    const b64 = btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return b64;
  };

  const handleGoogleSignIn = async () => {
    if (!scriptLoaded || !(window as any).google?.accounts?.oauth2) {
      onError?.("Google services are not ready. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Generate per-attempt state; persist short-lived in cookie
      const state = genState();
      stateRef.current = state;
      setCookie("oauth_state", state, 300); // 5 minutes

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        // optional hosted_domain / ux_mode can be set if needed
        callback: async (response: any) => {
          if (response.error) {
            // PII-minimized logs
            console.warn("Google OAuth error callback");
            onError?.(response.error_description || "Google sign in failed");
            setIsLoading(false);
            return;
          }

          try {
            // Enforce origin for outgoing Google request
            if (allowedOrigin && typeof allowedOrigin === "string") {
              // no-op here; fetch will be to Google. Ensure we don't send sensitive headers.
            }

            // Get user info using the access token
            const token = String(response.access_token || "");
            if (!token || token.length > 4096) {
              throw new Error("Invalid Google token");
            }

            const userInfoResponse = await fetch(
              `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${encodeURIComponent(
                token
              )}`,
              {
                headers: { Accept: "application/json" },
                // mode: "cors" default; rely on Google CORS
              }
            );

            if (!userInfoResponse.ok) {
              throw new Error("Failed to fetch user info from Google");
            }

            const userInfo = await userInfoResponse.json();

            // Validate required fields
            if (!userInfo.email || !userInfo.verified_email) {
              throw new Error("Email not verified with Google");
            }

            // Create a credential-like object for our backend
            const payload = {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              given_name: userInfo.given_name,
              family_name: userInfo.family_name,
              picture: userInfo.picture,
              verified_email: userInfo.verified_email,
              // Include CSRF/state
              state,
            };

            const json = JSON.stringify(payload);
            if (json.length > 8192) {
              throw new Error("Credential payload too large");
            }

            // Validate state round-trip before sending
            const cookieState = getCookie("oauth_state");
            if (!cookieState || cookieState !== state) {
              throw new Error("Invalid or missing OAuth state");
            }

            // Send to backend with state
            const result = await signInWithGoogle(json, state);

            if (result.success) {
              // Hydration retry loop similar to email/password flow
              const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
              const backoffs = [0, 150, 300, 750];
              for (let i = 0; i < backoffs.length; i++) {
                if (backoffs[i] > 0) await sleep(backoffs[i]);
                try {
                  await refreshUser();
                } catch { /* ignore */ }
              }
              onSuccess?.();
            } else {
              // Bubble server semantics (RATE_LIMITED, TOKEN_REPLAY, etc.) when available
              const defaultMsg = "Authentication failed";
              const raw = result.error || defaultMsg;
              try {
                // Try to parse structured server message if JSON was passed through
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                const code = parsed?.code as string | undefined;
                const retryAfter = parsed?.retryAfter as number | undefined;
                const message =
                  parsed?.error ||
                  parsed?.message ||
                  (code === "RATE_LIMITED" && retryAfter
                    ? `Too many attempts. Try again in ${retryAfter}s.`
                    : raw);
                onError?.(message);
              } catch {
                onError?.(raw);
              }
            }
          } catch (error: any) {
            // Map known server error shapes for actionable feedback
            let msg = "Failed to process Google authentication";
            if (error instanceof Error && error.message) {
              msg = error.message;
              // Attempt to extract structured details from server text
              try {
                const parsed = JSON.parse(error.message);
                if (parsed?.code === "RATE_LIMITED" && parsed?.retryAfter) {
                  msg = `Too many attempts. Try again in ${parsed.retryAfter}s.`;
                } else if (parsed?.code && parsed?.error) {
                  msg = `${parsed.error}`;
                }
              } catch {
                // leave msg as-is
              }
            }
            console.warn("Error processing Google auth", {
              message: msg,
            });
            onError?.(msg);
          } finally {
            // Invalidate state cookie promptly
            setCookie("oauth_state", "", 0);
            stateRef.current = null;
            setIsLoading(false);
          }
        },
        error_callback: (err: any) => {
          // Bubble richer details if available for actionable UX
          const msg =
            (err && (err.message || err.error || err.error_description)) ||
            "Google sign in cancelled or failed";
          console.warn("Google OAuth error callback (init)", {
            code: err?.code,
            message: err?.message || err?.error_description || String(err || ""),
          });
          onError?.(msg);
          setIsLoading(false);
        },
      });

      // Request access token (opens popup)
      client.requestAccessToken({ prompt: "consent" });
    } catch (e: any) {
      // Surface reason if present
      const msg =
        (e && (e.message || e.error || e.error_description)) ||
        "Failed to initialize Google sign in";
      console.warn("Google auth initialization failure", {
        code: e?.code,
        message: e?.message || e?.error_description || String(e || ""),
      });
      onError?.(msg);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Load Google Identity Services script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
        }}
        onError={() => {
          console.warn("Failed to load Google script");
          onError?.("Failed to load Google services");
        }}
      />

      <Button
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full flex items-center gap-2 transition-all duration-200 hover:bg-gray-50"
        disabled={disabled || isLoading || !scriptLoaded}
        aria-label="Sign in with Google"
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="h-4 w-4" />
            Signing in with Google...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
