import { useState, useEffect } from "react";
import { useSignUp, useSignIn, useUser, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { checkEmailHasProfile } from "@/lib/profile/userProfileApi";

interface CustomSignupFormProps {
  onComplete?: () => void;
  onProfileExists?: () => void;
}

// --- Simple OTP input -----------------------------
interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}

function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const inputs = Array.from({ length });
  const refs = Array.from({ length }, () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState<HTMLInputElement | null>(null)
  );

  const handleChange = (idx: number, char: string) => {
    if (!/^[0-9]?$/.test(char)) return; // allow only digits
    const chars = value.split("").slice(0, length);
    chars[idx] = char;
    const newVal = chars.join("");
    onChange(newVal);
    if (char && idx < length - 1) {
      refs[idx + 1][0]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs[idx - 1][0]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {inputs.map((_, i) => (
        <Input
          key={i}
          ref={(el) => refs[i][1](el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="w-12 text-center font-mono tracking-widest"
        />
      ))}
    </div>
  );
}

export function CustomSignupForm({
  onComplete,
  onProfileExists,
}: CustomSignupFormProps) {
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const sendCode = async () => {
    if (!signUpLoaded || !signUp) {
      setError("Sign up is not loaded yet. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if email is already tied to a completed profile
      const { hasProfile } = await checkEmailHasProfile(email);
      if (hasProfile) {
        showErrorToast(
          null,
          "That email already has a profile. Please sign in instead.",
        );
        onProfileExists?.();
        setLoading(false);
        return;
      }

      // Create the sign-up
      const signUpAttempt = await signUp.create({
        emailAddress: email,
        password,
      });

      console.log("Sign-up created:", signUpAttempt);

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPhase("code");
      showSuccessToast("Verification code sent to your email");
    } catch (err: unknown) {
      console.error("Sign-up error details:", err);

      // Handle Clerk-specific errors
      if (err && typeof err === "object" && "errors" in err) {
        const clerkError = err as {
          errors: Array<{ message: string; code?: string }>;
        };
        const errorMessage =
          clerkError.errors?.[0]?.message ||
          "Failed to send verification code.";
        setError(errorMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to send verification code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      const verification = await signUp.attemptEmailAddressVerification({
        code,
      });

      console.log("Verification response:", verification);
      console.log("SignUp status:", signUp.status);

      // Check if verification is complete
      if (verification.status === "complete") {
        if (verification.createdSessionId) {
          await setActive({ session: verification.createdSessionId });
          console.log("Session activated successfully");
          return;
        }
      }

      // If not complete, check signUp status
      if (signUp.status === "complete" && signUp.createdSessionId) {
        // Activate session from signUp resource
        await setActive({ session: signUp.createdSessionId });
        console.log("Session activated from signUp");
        return;
      }

      // If we get here, verification failed
      setError("Invalid or expired code. Please check and try again.");
    } catch (err) {
      console.error("Verification error details:", err);
      // Check if it's a specific Clerk error
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
    if (!signUpLoaded || !signUp) return;
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      showSuccessToast("Verification code sent");
      setResendCooldown(30); // 30-second cooldown
    } catch {
      setError("Failed to resend code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try sign-in first for existing accounts
      if (signInLoaded && signIn) {
        const signInRes = await signIn.create({
          strategy: "oauth_google",
          redirectUrl: window.location.origin + "/oauth/callback",
          actionCompleteRedirectUrl: window.location.href,
        });

        // Check various possible locations for the auth URL
        const findAuthUrl = (obj: unknown, depth = 0): string | undefined => {
          if (!obj || typeof obj !== "object" || depth > 5) return undefined;

          for (const key in obj) {
            const value = (obj as Record<string, unknown>)[key];
            if (
              key.includes("externalVerificationRedirectURL") &&
              typeof value === "string"
            ) {
              return value;
            }
            const found = findAuthUrl(value, depth + 1);
            if (found) return found;
          }
          return undefined;
        };

        const authUrl = findAuthUrl(signInRes);

        if (authUrl) {
          window.open(authUrl, "_blank");
          setLoading(false);
          return;
        }
      }

      // Fall back to sign-up for new accounts
      if (!signUpLoaded || !signUp) return;

      const signUpRes = await signUp.create({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        actionCompleteRedirectUrl: window.location.href,
      });

      // Check various possible locations for the auth URL
      const findAuthUrl2 = (obj: unknown, depth = 0): string | undefined => {
        if (!obj || typeof obj !== "object" || depth > 5) return undefined;

        for (const key in obj) {
          const value = (obj as Record<string, unknown>)[key];
          if (
            key.includes("externalVerificationRedirectURL") &&
            typeof value === "string"
          ) {
            return value;
          }
          const found = findAuthUrl2(value, depth + 1);
          if (found) return found;
        }
        return undefined;
      };

      const authUrl = findAuthUrl2(signUpRes);

      if (authUrl) {
        window.open(authUrl, "_blank");
      } else {
        console.error("OAuth sign-up response:", signUpRes);
        setError("Failed to get OAuth URL from response");
      }
    } catch (err) {
      console.error("Google OAuth error", err);
      setError("Failed to initiate Google sign in");
    } finally {
      setLoading(false);
    }
  };

  // Listen for OAuth success messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our domain
      if (event.origin !== window.location.origin) return;

      // Check if it's an OAuth success message
      if (event.data?.type === "oauth-success" && event.data?.isSignedIn) {
        console.log("Received OAuth success message from popup");
        // The popup has closed, and the user is signed in
        // The isSignedIn state should update automatically via Clerk
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Fire completion callback when Clerk session becomes active
  useEffect(() => {
    if (isSignedIn && onComplete) {
      onComplete();
    }
  }, [isSignedIn, onComplete]);

  if (isSignedIn) {
    return (
      <p className="text-center text-sm">
        Account created! Submitting your profile...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {phase === "email" && (
        <>
          <Button
            onClick={handleGoogleSignUp}
            className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
            variant="outline"
            disabled={loading || (!signInLoaded && !signUpLoaded)}
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
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* CAPTCHA Widget - Must be present before calling signUp.create() */}
          <div id="clerk-captcha" />
          <Button
            className="w-full"
            onClick={sendCode}
            disabled={loading || !email || password.length < 8}
          >
            {loading ? "Sending..." : "Send Code"}
          </Button>
        </>
      )}
      {phase === "code" && (
        <>
          <OtpInput value={code} onChange={setCode} length={6} />
          <Button
            className="w-full"
            onClick={verifyCode}
            disabled={loading || code.length === 0}
          >
            {loading ? "Verifying..." : "Verify & Create Account"}
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
