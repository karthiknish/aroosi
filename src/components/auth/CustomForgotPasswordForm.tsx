import { useState, useEffect } from "react";
import { useSignIn, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { showSuccessToast } from "@/lib/ui/toast";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export function CustomForgotPasswordForm({
  onComplete,
}: CustomForgotPasswordFormProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // Send reset code to email
  const sendCode = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.create({
        identifier: email,
        strategy: "reset_password_email_code",
      });
      setPhase("code");
      showSuccessToast("Reset code sent to your email");
      setResendCooldown(30);
    } catch (err) {
      console.error("Forgot password send code error", err);
      setError("Unable to send code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (res.status === "complete") {
        // Set the active session if available
        if (res.createdSessionId) {
          await setActive({ session: res.createdSessionId });
        }
        showSuccessToast(
          "Code verified. Please check your email for reset link.",
        );
        onComplete?.();
        return;
      }

      setError("Invalid or expired code. Please try again.");
    } catch (err) {
      console.error("Verify reset code error", err);
      if (err instanceof Error) {
        if (
          err.message.includes("incorrect_code") ||
          err.message.includes("invalid")
        ) {
          setError("The code you entered is incorrect. Please try again.");
        } else if (err.message.includes("expired")) {
          setError("The code has expired. Please request a new one.");
        } else {
          setError(`Verification failed: ${err.message}`);
        }
      } else {
        setError("Incorrect or expired code. Please request a new one.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!signInLoaded || !signIn) return;
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      // prepareFirstFactor may exist
      const hasPrepare = (
        obj: unknown,
      ): obj is {
        prepareFirstFactor: (args: { strategy: string }) => Promise<unknown>;
      } =>
        typeof obj === "object" &&
        obj !== null &&
        "prepareFirstFactor" in obj &&
        typeof (obj as { prepareFirstFactor?: unknown }).prepareFirstFactor ===
          "function";

      if (hasPrepare(signIn)) {
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
        });
      } else {
        await signIn.create({
          identifier: email,
          strategy: "reset_password_email_code",
        });
      }
      showSuccessToast("Reset code sent");
      setResendCooldown(30);
    } catch (err) {
      console.error("Resend code error", err);
      setError("Failed to resend code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleSignIn = async () => {
    if (!signInLoaded || !signIn) return;

    setLoading(true);
    setError(null);
    try {
      const res = await signIn.create({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        actionCompleteRedirectUrl: window.location.href,
      });

      // Extract the OAuth URL from the response
      let authUrl: string | undefined;

      // Helper to safely access nested properties
      const getNestedProp = (obj: unknown, path: string[]): unknown => {
        let current: unknown = obj;
        for (const key of path) {
          if (
            typeof current === "object" &&
            current !== null &&
            key in current
          ) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return undefined;
          }
        }
        return current;
      };

      // Check various possible locations for the auth URL
      if (res && typeof res === "object") {
        // Try different possible paths where Clerk might put the URL
        const possiblePaths = [
          ["externalVerificationRedirectURL"],
          ["firstFactorVerification", "externalVerificationRedirectURL"],
          [
            "externalAccount",
            "verification",
            "externalVerificationRedirectURL",
          ],
          [
            "verifications",
            "externalAccount",
            "externalVerificationRedirectURL",
          ],
        ];

        for (const path of possiblePaths) {
          const value = getNestedProp(res, path);
          if (
            typeof value === "string" &&
            value.includes("accounts.google.com")
          ) {
            authUrl = value;
            break;
          }
        }

        // If not found in common paths, search recursively
        if (!authUrl) {
          const findAuthUrl = (obj: unknown): string | undefined => {
            if (!obj || typeof obj !== "object") return undefined;

            for (const key in obj) {
              const value = (obj as Record<string, unknown>)[key];
              if (
                key === "externalVerificationRedirectURL" &&
                typeof value === "string"
              ) {
                return value;
              }
              const found = findAuthUrl(value);
              if (found) return found;
            }
            return undefined;
          };

          authUrl = findAuthUrl(res);
        }
      }

      if (authUrl) {
        // Open in a popup window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          authUrl,
          "Google Sign In",
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
        );

        // Check if popup was blocked
        if (!popup || popup.closed) {
          setError("Please allow popups for this site to sign in with Google");
          setLoading(false);
          return;
        }

        // Poll to check if the popup is closed
        const checkInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkInterval);
            setLoading(false);
            // User might be signed in now, trigger completion
            onComplete?.();
          }
        }, 1000);
      } else {
        console.error("Could not find OAuth URL in response:", res);
        setError("Failed to initiate Google sign in. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Google signin error", err);
      setError("Failed to initiate Google sign in");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {phase === "email" && (
        <>
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
            variant="outline"
            disabled={loading || !signInLoaded}
          >
            <GoogleIcon className="h-5 w-5" />
            <span>Continue with Google</span>
          </Button>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={sendCode}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </Button>
        </>
      )}
      {phase === "code" && (
        <>
          <Input
            placeholder="Reset code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={verifyCode}
            disabled={loading || code.length === 0}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={loading || resendCooldown > 0}
            onClick={resendCode}
            className="w-full text-sm text-gray-600"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend Code"}
          </Button>
        </>
      )}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
