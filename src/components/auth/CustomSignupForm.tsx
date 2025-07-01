import { useState, useEffect } from "react";
import { useSignUp, useSignIn, useUser, useClerk } from "@clerk/nextjs";
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

      console.log("Verification response:", verification);
      console.log("SignUp status:", signUp.status);

      // Check if verification is complete
      if (verification.status === "complete") {
        // Set the active session
        await setActive({ session: verification.createdSessionId });
        console.log("Session activated successfully");
        return;
      }

      // If not complete, check signUp status
      if (signUp.status === "complete") {
        // Create session if signUp is complete but verification isn't
        const { createdSessionId } = signUp;
        if (createdSessionId) {
          await setActive({ session: createdSessionId });
          console.log("Session activated from signUp");
          return;
        }
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
    if (!signUpLoaded || !signUp) return;

    setLoading(true);
    setError(null);
    try {
      // Create the sign up with OAuth
      await signUp.create({
        strategy: "oauth_google",
      });

      // Open Google OAuth in a popup window
      const authUrl = signUp.authorizeWithOAuth({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        redirectUrlComplete: window.location.href,
      });

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
          // The useEffect watching isSignedIn will handle the rest
        }
      }, 1000);
    } catch (err) {
      console.error("Google signup error", err);
      setError("Failed to initiate Google sign up");
      setLoading(false);
    }
  };

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
