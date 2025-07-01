import { useState, useEffect } from "react";
import { useSignIn } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showSuccessToast } from "@/lib/ui/toast";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export function CustomForgotPasswordForm({
  onComplete,
}: CustomForgotPasswordFormProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();

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

      if (res.status !== "complete") {
        setError("Invalid or expired code. Please try again.");
        return;
      }

      showSuccessToast(
        "Code verified. Please check your email for reset link."
      );
      onComplete?.();
    } catch (err) {
      console.error("Verify reset code error", err);
      setError("Incorrect or expired code. Please request a new one.");
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
        obj: unknown
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
