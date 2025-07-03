import { useState, useEffect } from "react";
import { useSignIn, useUser, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

interface CustomSignInFormProps {
  onComplete?: () => void;
}

export function CustomSignInForm({ onComplete }: CustomSignInFormProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!signInLoaded || !signIn) return;

    setLoading(true);
    setError(null);
    try {
      // Use authenticateWithRedirect for OAuth flow
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        redirectUrlComplete: window.location.origin + "/oauth/callback",
      });
    } catch (err) {
      console.error("Google signin error", err);
      setError("Failed to initiate Google sign in");
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await signIn.create({ identifier: email, password });

      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        return;
      }

      // If status is needs_first_factor etc., attempt first factor
      if (res.status === "needs_first_factor") {
        const attempt = await signIn.attemptFirstFactor({
          strategy: "password",
          password,
        });
        if (attempt.status === "complete") {
          await setActive({ session: attempt.createdSessionId });
          return;
        }
      }

      setError("Invalid credentials. Please try again.");
    } catch (err) {
      console.error("Password sign-in error", err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // Fire completion callback when Clerk session becomes active
  useEffect(() => {
    if (isSignedIn && onComplete) {
      onComplete();
    }
  }, [isSignedIn, onComplete]);

  if (isSignedIn) {
    return <p className="text-center text-sm">Signed in!</p>;
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGoogleSignIn}
        className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
        variant="outline"
        disabled={loading || !signInLoaded}
      >
        <GoogleIcon className="h-5 w-5" />
        <span>Continue with Google</span>
      </Button>

      <Input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        className="w-full"
        onClick={handlePasswordSignIn}
        disabled={loading || !email || !password}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
