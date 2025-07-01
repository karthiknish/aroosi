import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useState } from "react";

interface GoogleAuthButtonProps {
  mode: "sign-in" | "sign-up";
  disabled?: boolean;
}

export function GoogleAuthButton({ mode, disabled }: GoogleAuthButtonProps) {
  const { signIn, isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError(null);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/oauth/callback`,
        redirectUrlComplete: `${window.location.origin}/oauth/callback`,
      });
    } catch (err) {
      console.error("Google auth error:", err);
      setError("Failed to connect with Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGoogleAuth}
        className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
        variant="outline"
        disabled={disabled || loading || !isLoaded}
      >
        <GoogleIcon className="h-5 w-5" />
        <span>{loading ? "Connecting..." : `Continue with Google`}</span>
      </Button>
      {error && (
        <p className="text-red-500 text-sm text-center mt-2">{error}</p>
      )}
    </>
  );
}
