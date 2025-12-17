"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export default function CustomForgotPasswordForm({
  onComplete,
}: CustomForgotPasswordFormProps) {
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const { sendPasswordReset } = useFirebaseAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const safeEmail = String(email || "").trim();
      if (!safeEmail) {
        setError("Please enter your email address.");
        return;
      }

      setSubmitting(true);
      try {
        const result = await sendPasswordReset(safeEmail);
        if (!result.success) {
          throw new Error(result.error || "Failed to send password reset email.");
        }
        
        const msg = "If that email exists, we sent a password reset link.";
        setSuccess(msg);
        showSuccessToast(msg);
        if (onComplete) {
          setTimeout(() => onComplete(), 800);
        }
      } catch (err: any) {
        const msg =
          err?.message ||
          "We couldn't process your request right now. Please try again.";
        const finalMsg =
          msg.includes("too_many_requests") || msg.includes("429")
            ? "Too many requests. Please try again later."
            : msg;
        setError(finalMsg);
        showErrorToast(finalMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [email, onComplete, sendPasswordReset]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold">Forgot Password</h2>
        <p className="text-neutral-light mt-1">
          Enter your email to receive a reset link.
        </p>
      </div>

      {success && (
        <Alert className="mb-4" variant="default">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral mb-1"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onBlur={() => setTouched(true)}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          error={touched && !email}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting || !email}>
        {submitting ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
