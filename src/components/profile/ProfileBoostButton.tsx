"use client";

import { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
// Use the implemented API helper inside lib/profile
import { boostProfile } from "@/lib/profile/userProfileApi";
import { subscriptionAPI } from "@/lib/api/subscription";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Rocket, Zap, Clock } from "lucide-react";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Badge } from "@/components/ui/badge";
import { PremiumFeatureGuard } from "@/components/subscription/PremiumFeatureGuard";
import { FeatureUsageTracker } from "@/components/subscription/FeatureUsageTracker";

// Removed client month key quota reset guess; rely on server quota endpoint

function formatTimeRemaining(boostedUntil: number): string {
  const now = Date.now();
  const timeLeft = boostedUntil - now;

  if (timeLeft <= 0) return "";

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

const ProfileBoostButton = () => {
  const { profile, refetchProfileStatus, isLoading } = useProfileContext();
  // Cookie-only auth: no client token required
  const { user: authUser, profile: authProfile } = useAuthContext();
  const userId =
    authUser?.uid ||
    (authProfile as any)?._id ||
    (authProfile as any)?.userId ||
    "";
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [progressPct, setProgressPct] = useState<number>(0);

  // Update time remaining every minute when boosted
  useEffect(() => {
    if (!profile?.boostedUntil) return;

    const updateTime = () => {
      if (profile.boostedUntil && profile.boostedUntil > Date.now()) {
        setTimeRemaining(formatTimeRemaining(profile.boostedUntil));
        const total = 24 * 60 * 60 * 1000;
        const elapsed = total - (profile.boostedUntil - Date.now());
        setProgressPct(Math.min(100, Math.max(0, (elapsed / total) * 100)));
      } else {
        setTimeRemaining("");
        setProgressPct(0);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [profile?.boostedUntil]);

  const [boostsRemaining, setBoostsRemaining] = useState<number | null>(null);
  // Fetch quota (moved above conditional returns so hooks aren't conditional)
  useEffect(() => {
    let cancelled = false;
    async function loadQuota() {
      try {
        const result = await subscriptionAPI.getBoostQuota();
        if (!cancelled && result.success) {
          if (result.unlimited) setBoostsRemaining(-1);
          else if (typeof result.remaining === "number")
            setBoostsRemaining(result.remaining);
        }
      } catch {
        // silent
      }
    }
    loadQuota();
    const interval = setInterval(loadQuota, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile?.boostedUntil]);

  if (isLoading || !profile) return null;

  const handleBoost = async () => {
    setLoading(true);
    try {
      const result = await boostProfile(userId || "");
      if (result.success) {
        showSuccessToast(
          `Profile boosted for 24 hours! Your profile will appear first in search results. (${result.boostsRemaining ?? 0} boosts left this month)`
        );
      } else {
        // Show granular server message if present
        const message = result.message || "Boost failed";
        // If out of boosts, surface next reset date (1st of next month UTC)
        let extra = "";
        if (message.toLowerCase().includes("no boosts")) {
          const now = new Date();
          const nextReset = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)
          );
          extra = ` Next reset on ${nextReset.toUTCString()}.`;
        }
        showErrorToast(`${message}.${extra}`);
      }
      await refetchProfileStatus?.();
    } catch (error: unknown) {
      showErrorToast(error, "Boost failed");
    } finally {
      setLoading(false);
    }
  };

  const effectiveRemaining = boostsRemaining ?? profile.boostsRemaining ?? 0;

  const isCurrentlyBoosted =
    !!profile.boostedUntil && profile.boostedUntil > Date.now();
  const disabled =
    loading ||
    (effectiveRemaining !== -1 && effectiveRemaining <= 0) ||
    isCurrentlyBoosted;

  if (isCurrentlyBoosted) {
    return (
      <div className="space-y-2 p-3 border rounded-md bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-white flex items-center gap-1">
            <Zap className="h-3 w-3 fill-current" />
            Boost Active
          </Badge>
          {timeRemaining && (
            <div className="text-xs text-neutral-light flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </div>
          )}
        </div>
        <div className="h-1 w-full bg-primary/20 rounded overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[11px] text-primary-dark">
          Your profile is highlighted and appears first in search results while
          this boost is active.
        </p>
      </div>
    );
  }

  return (
    <PremiumFeatureGuard
      feature="profile_boost"
      requiredTier="premiumPlus"
      onUpgrade={() => (window.location.href = "/subscription")}
    >
      <FeatureUsageTracker feature="profile_boost_used">
        <div className="space-y-2">
          <Button
            onClick={handleBoost}
            disabled={disabled}
            variant={
              effectiveRemaining > 0 || effectiveRemaining === -1
                ? "default"
                : "secondary"
            }
            className="bg-primary hover:bg-primary-dark text-white"
          >
            {loading ? (
              <LoadingSpinner size={16} className="mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Boost Profile (24h)
          </Button>
          <div className="text-xs text-neutral-light">
            {effectiveRemaining === -1
              ? "Unlimited boosts"
              : effectiveRemaining > 0
                ? `${effectiveRemaining} boost${effectiveRemaining === 1 ? "" : "s"} remaining this month`
                : "No boosts remaining this month"}
          </div>
        </div>
      </FeatureUsageTracker>
    </PremiumFeatureGuard>
  );
};

export default ProfileBoostButton;
