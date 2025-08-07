"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { postJson } from "@/lib/http/client";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export default function CustomForgotPasswordForm({ onComplete }: CustomForgotPasswordFormProps) {
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        // Public endpoint
        await postJson<{ message?: string }>(
          "/api/auth/forgot-password",
          { email: safeEmail },
          { cache: "no-store" }
        );
        setSuccess("If an account with that email exists, we sent a password reset link.");
        if (onComplete) {
          // Small delay so users can read the message if they stay on page
          setTimeout(() => onComplete(), 800);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "We couldn't process your request right now. Please try again.";
        setError(msg.includes("429") ? "Too many requests. Please try again later." : msg);
      } finally {
        setSubmitting(false);
      }
    },
    [email, onComplete]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold">Forgot Password</h2>
        <p className="text-gray-600 mt-1">Enter your email to receive a reset link.</p>
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
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
