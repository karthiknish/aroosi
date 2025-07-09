'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import Link from "next/link";

interface CustomSignInFormProps {
  onComplete?: () => void;
}

export function CustomSignInForm({ onComplete }: CustomSignInFormProps) {
  const router = useRouter();
  const auth = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Implement Google OAuth with native auth
      setError("Google sign-in will be available soon");
    } catch (err) {
      console.error("Google signin error", err);
      setError("Failed to initiate Google sign in");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await auth.signIn({ email, password });
      
      if (result.success) {
        // Redirect will be handled by middleware or onComplete callback
        if (onComplete) {
          onComplete();
        } else {
          router.push('/search');
        }
      } else {
        setError(result.error || 'Sign in failed');
      }
    } catch (err) {
      console.error("Password sign-in error", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSignIn();
    }
  };

  // Fire completion callback when user is authenticated
  useEffect(() => {
    if (auth.isAuthenticated && onComplete) {
      onComplete();
    }
  }, [auth.isAuthenticated, onComplete]);

  if (auth.isAuthenticated) {
    return <p className="text-center text-sm">Signed in!</p>;
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGoogleSignIn}
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
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      
      <div className="text-right">
        <Link 
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        className="w-full"
        onClick={handlePasswordSignIn}
        disabled={loading || !email || !password}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link 
          href="/sign-up"
          className="text-primary hover:underline"
        >
          Sign up
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
