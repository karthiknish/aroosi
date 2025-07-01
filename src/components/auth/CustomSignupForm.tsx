import { useState, useEffect } from "react";
import { useSignUp, useSignIn, useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { showSuccessToast } from "@/lib/ui/toast";

interface CustomSignupFormProps {
  onComplete?: () => void;
}

export function CustomSignupForm({ onComplete }: CustomSignupFormProps) {
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();

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
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPhase("code");
    } catch {
      setError("Failed to send verification code. Please try again.");
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

      if (
        (verification.status === "complete" || signUp.status === "complete") &&
        signInLoaded
      ) {
        // Automatically sign the user in using the same credentials
        await signIn.create({ identifier: email, password });
      }
    } catch {
      setError("Invalid code. Please check and try again.");
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
    const canUseSignIn = signInLoaded && signIn;
    const canUseSignUp = signUpLoaded && signUp;

    if (!canUseSignIn && !canUseSignUp) return;

    setLoading(true);
    setError(null);
    try {
      const authCreator = canUseSignIn ? signIn : signUp;
      const res = await authCreator!.create({
        strategy: "oauth_google",
        redirectUrl: "/oauth/callback",
        actionCompleteRedirectUrl: "/oauth/callback",
      });

      // type guard helpers
      const hasExtUrl = (
        value: unknown
      ): value is { externalVerificationRedirectURL?: string } =>
        typeof value === "object" &&
        value !== null &&
        "externalVerificationRedirectURL" in value &&
        typeof (value as Record<string, unknown>)
          .externalVerificationRedirectURL === "string";

      let authUrl: string | undefined;
      const obj = res as unknown;
      if (hasExtUrl(obj)) {
        authUrl = obj.externalVerificationRedirectURL;
      } else if (
        typeof obj === "object" &&
        obj !== null &&
        "firstFactorVerification" in obj
      ) {
        const ff = (obj as { firstFactorVerification: unknown })
          .firstFactorVerification;
        if (hasExtUrl(ff)) {
          authUrl = ff.externalVerificationRedirectURL;
        }
      }

      if (authUrl) {
        window.open(authUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Google signup error", err);
      setError("Failed to initiate Google sign up");
    } finally {
      setLoading(false);
    }
  };

  // Fire completion callback when Clerk session becomes active
  if (isSignedIn) {
    onComplete?.();
    return (
      <p className="text-center text-sm">
        Account created! You can close this window.
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
          <Input
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
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
