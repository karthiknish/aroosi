import { useState } from "react";
import { useSignUp, useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomSignupFormProps {
  onComplete?: () => void;
}

export function CustomSignupForm({ onComplete }: CustomSignupFormProps) {
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await signUp.attemptEmailAddressVerification({ code });
    } catch {
      setError("Invalid code. Please check and try again.");
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
          <h3 className="text-lg font-semibold text-center">
            Create your account
          </h3>
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
        </>
      )}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
