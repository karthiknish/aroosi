"use client";

import { useClerkAuthApi } from "@/hooks/useClerkAuthApi";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Chrome } from "lucide-react";

interface GoogleAuthButtonProps {
  text?: string;
  className?: string;
  redirectUrlComplete?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleAuthButton({
  text = "Continue with Google",
  className,
  redirectUrlComplete,
  onSuccess,
  onError,
}: GoogleAuthButtonProps) {
  const { signInWithOAuth } = useClerkAuthApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithOAuth("google", redirectUrlComplete);
      
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || "Google sign in failed");
      }
    } catch (error: any) {
      onError?.(error?.message || "Google sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      onClick={handleGoogleSignIn}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Chrome className="mr-2 h-4 w-4" />
      )}
      {text}
    </Button>
  );
}
