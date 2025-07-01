import { useState, useEffect } from "react";
import { useSignIn, useUser, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { showSuccessToast } from "@/lib/ui/toast";

interface CustomSignInFormProps {
  onComplete?: () => void;
}

export function CustomSignInForm({ onComplete }: CustomSignInFormProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const sendCode = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.create({ identifier: email, strategy: "email_code" });
      setPhase("code");
    } catch {
      setError("Unable to send code. Please try again.");
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
        strategy: "email_code",
        code,
      });

      if (res.status === "complete") {
        // Set the active session
        await setActive({ session: res.createdSessionId });
        console.log("Session activated successfully");
        return;
      }

      setError("Invalid or expired code. Please try again.");
    } catch (err) {
      console.error("Sign-in verification error", err);
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
          strategy: "email_code",
        });
      } else {
        // fallback: create again triggers code
        await signIn.create({ identifier: email, strategy: "email_code" });
      }
      showSuccessToast("Verification code sent");
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
      // Use authenticateWithRedirect for OAuth flow
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        redirectUrlComplete: window.location.origin + "/oauth/callback",
      });
    } catch (err) {
      console.error("Google signin error", err);
      setError("Failed to initiate Google sign in");
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
    return <p className="text-center text-sm">Signed in!</p>;
  }

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
            {loading ? "Verifying..." : "Verify & Sign In"}
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
