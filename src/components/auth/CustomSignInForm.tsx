import { useState } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomSignInFormProps {
  onComplete?: () => void;
}

export function CustomSignInForm({ onComplete }: CustomSignInFormProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await signIn.attemptFirstFactor({ strategy: "email_code", code });
    } catch {
      setError("Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSignedIn) {
    onComplete?.();
    return <p className="text-center text-sm">Signed in!</p>;
  }

  return (
    <div className="space-y-4">
      {phase === "email" && (
        <>
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
        </>
      )}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
