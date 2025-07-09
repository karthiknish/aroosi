'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CustomForgotPasswordFormProps {
  onComplete?: () => void;
}

export function CustomForgotPasswordForm({
  onComplete,
}: CustomForgotPasswordFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleForgotPassword();
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="text-green-600">
          <h3 className="text-lg font-semibold">Check Your Email</h3>
          <p className="text-sm mt-2">
            If an account with this email exists, you will receive a password reset link.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          <p>Didn't receive the email?</p>
          <p>Check your spam folder or try again with a different email.</p>
        </div>
        <Link 
          href="/sign-in"
          className="text-primary hover:underline text-sm"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Forgot Password</h2>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      
      <Button
        className="w-full"
        onClick={handleForgotPassword}
        disabled={loading || !email}
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>

      <div className="text-center">
        <Link 
          href="/sign-in"
          className="text-sm text-primary hover:underline"
        >
          Back to Sign In
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
