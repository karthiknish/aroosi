"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chrome, Loader2 } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

interface Props {
  text?: string;
  redirectUrl?: string;
  className?: string;
  onSuccess?: () => void;
  onBlocked?: (msg: string) => void;
}

export function GoogleExistingOnlyButton({
  text = "Sign in with Google",
  redirectUrl = "/search",
  className,
  onSuccess,
  onBlocked,
}: Props) {
  const { signInWithGoogleExistingOnly } = useFirebaseAuth();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await signInWithGoogleExistingOnly();
          if (!res.success) {
            const msg = res.error || "No existing account for this Google email.";
            showErrorToast(msg);
            onBlocked?.(msg);
          } else {
            showSuccessToast("Signed in successfully");
            if (typeof window !== "undefined") window.location.href = redirectUrl;
            onSuccess?.();
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />} {text}
    </Button>
  );
}
