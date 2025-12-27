"use client";
import React, { useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { requestEmailVerification } from "@/lib/auth/clientAuth";

export default function VerifyEmailBanner() {
  const { user, profile, isSignedIn, refreshProfile } = useAuthContext();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  
  // Check both Firebase Auth and Firestore profile for verification status
  const emailVerified = user?.emailVerified || profile?.emailVerified;
  
  if (!isSignedIn || emailVerified) return null;

  const recentlySent = !!(sentAt && Date.now() - sentAt < 60_000); // 60s cooldown

  return (
    <div className="bg-accent/10 border-b border-accent/20 text-accent-dark text-sm relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex-1">
          <strong className="font-medium">Verify your email.</strong> Please
          confirm your email address to secure your account and enable all
          features.
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-accent-dark hover:bg-accent/10"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                await refreshProfile();
              } finally {
                setChecking(false);
              }
            }}
          >
            {checking ? "Checking..." : "Check Status"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={sending || recentlySent}
            onClick={async () => {
              if (recentlySent) return;
              setSending(true);
              try {
                const result = await requestEmailVerification();
                if (!result.success) {
                  showErrorToast(
                    result.error || "Failed to send verification email"
                  );
                } else {
                  showSuccessToast("Verification email sent");
                  setSentAt(Date.now());
                }
              } catch (e) {
                showErrorToast("Network error sending email");
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? "Sending..." : recentlySent ? "Sent" : "Send Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
