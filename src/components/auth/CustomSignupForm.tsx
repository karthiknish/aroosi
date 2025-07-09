'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Link from "next/link";

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

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;

    const chars = value.split("").slice(0, length);
    for (let i = 0; i < pasted.length && idx + i < length; i++) {
      chars[idx + i] = pasted[i];
    }
    const newVal = chars.join("");
    onChange(newVal);

    const focusPos = Math.min(idx + pasted.length - 1, length - 1);
    refs[focusPos][0]?.focus();
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
          onPaste={(e) => handlePaste(e, i)}
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
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await auth.signUp({ 
        email, 
        password, 
        fullName 
      });
      
      if (result.success) {
        setSuccess(true);
        if (onComplete) {
          onComplete();
        } else {
          router.push('/sign-in?message=account-created');
        }
      } else {
        if (result.error?.includes('already exists')) {
          setError('An account with this email already exists. Please sign in instead.');
          onProfileExists?.();
        } else {
          setError(result.error || 'Sign up failed');
        }
      }
    } catch (err) {
      console.error("Sign-up error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Implement Google OAuth with native auth
      setError("Google sign-up will be available soon");
    } catch (err) {
      console.error("Google OAuth error", err);
      setError("Failed to initiate Google sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignUp();
    }
  };

  // Fire completion callback when user is authenticated
  useEffect(() => {
    if (auth.isAuthenticated && onComplete) {
      onComplete();
    }
  }, [auth.isAuthenticated, onComplete]);

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-green-600 text-sm">
          Account created successfully! Please check your email for verification.
        </p>
        <p className="text-sm text-gray-600">
          You can now sign in with your credentials.
        </p>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <p className="text-center text-sm">
        Account created! Setting up your profile...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGoogleSignUp}
        className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
        variant="outline"
        disabled={loading}
      >
        <GoogleIcon className="h-5 w-5" />
        <span>Continue with Google</span>
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <Input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <Input
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <Input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      
      <Button
        className="w-full"
        onClick={handleSignUp}
        disabled={loading || !fullName || !email || !password || !confirmPassword}
      >
        {loading ? "Creating Account..." : "Create Account"}
      </Button>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link 
          href="/sign-in"
          className="text-primary hover:underline"
        >
          Sign in
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
