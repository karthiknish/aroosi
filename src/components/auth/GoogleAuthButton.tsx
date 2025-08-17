"use client";

import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
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
  redirectUrlComplete = "/search",
  onSuccess,
  onError,
}: GoogleAuthButtonProps) {
  const { signInWithGoogle } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        // Redirect to the specified URL or default to search
        if (typeof window !== "undefined") {
          window.location.href = redirectUrlComplete;
        }
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
