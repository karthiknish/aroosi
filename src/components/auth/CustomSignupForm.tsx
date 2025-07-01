import { useState, useEffect } from "react";
import { useSignUp, useSignIn, useUser, useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { showSuccessToast } from "@/lib/ui/toast";

interface CustomSignupFormProps {
  onComplete?: () => void;
}

export function CustomSignupForm({ onComplete }: CustomSignupFormProps) {
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const { setActive } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const sendCode = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPhase("code");
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!signUpLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      const verification = await signUp.attemptEmailAddressVerification({
        code,
      });

      console.log("Verification response:", verification);
      console.log("SignUp status:", signUp.status);

      // Check if verification is complete
      if (verification.status === "complete") {
        if (verification.createdSessionId) {
          await setActive({ session: verification.createdSessionId });
          console.log("Session activated successfully");
          return;
        }
      }

      // If not complete, check signUp status
      if (signUp.status === "complete" && signUp.createdSessionId) {
        // Activate session from signUp resource
        await setActive({ session: signUp.createdSessionId });
        console.log("Session activated from signUp");
        return;
      }

      // If we get here, verification failed
      setError("Invalid or expired code. Please check and try again.");
    } catch (err) {
      console.error("Verification error details:", err);
      // Check if it's a specific Clerk error
      if (err instanceof Error) {
        if (
          err.message.includes("incorrect_code") ||
          err.message.includes("invalid")
        ) {
          setError("The code you entered is incorrect. Please try again.");
        } else if (err.message.includes("expired")) {
          setError("The code has expired. Please request a new one.");
        } else {
          setError(`Verification failed: ${err.message}`);
        }
      } else {
        setError("Incorrect or expired code. Please request a new one.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!signUpLoaded || !signUp) return;
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      showSuccessToast("Verification code sent");
      setResendCooldown(30); // 30-second cooldown
    } catch {
      setError("Failed to resend code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleSignUp = async () => {
    // Try sign in first (for existing users)
    if (signInLoaded && signIn) {
      try {
        const res = await signIn.create({
          strategy: "oauth_google",
          redirectUrl: window.location.origin + "/oauth/callback",
          actionCompleteRedirectUrl: window.location.href,
        });

        console.log("OAuth sign-in response:", res);

        // Check for authorization URL in the response
        let authUrl: string | undefined;

        if (res && typeof res === "object" && res !== null) {
          // Narrow the potential externalAccount property safely without using 'any'
          const maybeExternalAccount = (
            res as unknown as Record<string, unknown>
          ).externalAccount;

          if (
            typeof maybeExternalAccount === "object" &&
            maybeExternalAccount !== null &&
            "data" in maybeExternalAccount
          ) {
            const dataProp = (maybeExternalAccount as Record<string, unknown>)
              .data;

            if (
              typeof dataProp === "object" &&
              dataProp !== null &&
              "authorization_url" in dataProp &&
              typeof (dataProp as Record<string, unknown>).authorization_url ===
                "string"
            ) {
              authUrl = (dataProp as { authorization_url: string })
                .authorization_url;
            }
          }
        }

        if (authUrl) {
          console.log("Found auth URL from sign-in:", authUrl);
          // Open in a popup window
          const width = 500;
          const height = 600;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;

          const popup = window.open(
            authUrl,
            "Google Sign In",
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
          );

          if (!popup || popup.closed) {
            setError(
              "Please allow popups for this site to sign in with Google"
            );
            return;
          }

          // Poll to check if the popup is closed
          const checkInterval = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkInterval);
              setLoading(false);
              // Check if user is now signed in after a short delay
              setTimeout(() => {
                if (!isSignedIn) {
                  console.log("Popup closed without completing sign-in");
                }
              }, 1000);
            }
          }, 1000);
          return;
        }
      } catch (err) {
        console.log("Sign-in attempt failed, trying sign-up:", err);
      }
    }

    // If sign-in didn't work, try sign-up
    if (!signUpLoaded || !signUp) return;

    // Determine if we're on a mobile device
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Open placeholder popup for desktop to avoid blockers; on mobile we'll redirect
    let popup: Window | null = null;
    if (!isMobile) {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      popup = window.open(
        "about:blank",
        "Google Sign In",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        setError("Please allow pop-ups for this site to sign in with Google");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await signUp.create({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth/callback",
        actionCompleteRedirectUrl: window.location.href,
      });

      console.log("OAuth sign-up response:", res);

      // Extract the OAuth URL from the response
      let authUrl: string | undefined;

      // Helper to safely access nested properties
      const getNestedProp = (obj: unknown, path: string[]): unknown => {
        let current: unknown = obj;
        for (const key of path) {
          if (
            typeof current === "object" &&
            current !== null &&
            key in current
          ) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return undefined;
          }
        }
        return current;
      };

      // Check various possible locations for the auth URL
      if (res && typeof res === "object") {
        // Try different possible paths where Clerk might put the URL
        const possiblePaths = [
          ["externalAccount", "data", "authorization_url"],
          ["externalVerificationRedirectURL"],
          ["firstFactorVerification", "externalVerificationRedirectURL"],
          [
            "externalAccount",
            "verification",
            "externalVerificationRedirectURL",
          ],
          [
            "verifications",
            "externalAccount",
            "externalVerificationRedirectURL",
          ],
        ];

        for (const path of possiblePaths) {
          const value = getNestedProp(res, path);
          if (typeof value === "string" && value.length > 0) {
            authUrl = value;
            console.log("Found OAuth URL at path:", path, "URL:", value);
            break;
          }
        }

        // If not found in common paths, search recursively
        if (!authUrl) {
          const findAuthUrl = (obj: unknown, depth = 0): string | undefined => {
            if (!obj || typeof obj !== "object" || depth > 5) return undefined;

            for (const key in obj) {
              const value = (obj as Record<string, unknown>)[key];

              // Check if this key might contain a URL
              if (
                (key.toLowerCase().includes("url") ||
                  key.toLowerCase().includes("auth") ||
                  key.toLowerCase().includes("redirect")) &&
                typeof value === "string" &&
                value.startsWith("http")
              ) {
                console.log(`Found potential URL at key "${key}":`, value);
                return value;
              }

              const found = findAuthUrl(value, depth + 1);
              if (found) return found;
            }
            return undefined;
          };

          authUrl = findAuthUrl(res);
        }
      }

      if (isMobile) {
        // On mobile, perform a full redirect
        window.location.href = authUrl;
      } else if (popup) {
        // Navigate previously opened popup
        popup.location.href = authUrl;
      }
    } catch (err) {
      if (popup) popup.close();
      console.error("Google signup error", err);
      setError("Failed to initiate Google sign up");
      setLoading(false);
    }
  };

  // Listen for OAuth success messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our domain
      if (event.origin !== window.location.origin) return;

      // Check if it's an OAuth success message
      if (event.data?.type === "oauth-success" && event.data?.isSignedIn) {
        console.log("Received OAuth success message from popup");
        // The popup has closed, and the user is signed in
        // The isSignedIn state should update automatically via Clerk
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Fire completion callback when Clerk session becomes active
  useEffect(() => {
    if (isSignedIn && onComplete) {
      onComplete();
    }
  }, [isSignedIn, onComplete]);

  if (isSignedIn) {
    return (
      <p className="text-center text-sm">
        Account created! Submitting your profile...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {phase === "email" && (
        <>
          <Button
            onClick={handleGoogleSignUp}
            className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
            variant="outline"
            disabled={loading || (!signInLoaded && !signUpLoaded)}
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
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={sendCode}
            disabled={loading || !email || password.length < 8}
          >
            {loading ? "Sending..." : "Send Code"}
          </Button>
        </>
      )}
      {phase === "code" && (
        <>
          <Input
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={verifyCode}
            disabled={loading || code.length === 0}
          >
            {loading ? "Verifying..." : "Verify & Create Account"}
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
