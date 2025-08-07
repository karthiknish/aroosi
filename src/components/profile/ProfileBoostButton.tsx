"use client";

import { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
// Use the implemented API helper inside lib/profile
import { boostProfile } from "@/lib/profile/userProfileApi";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Rocket, Zap, Clock } from "lucide-react";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useAuthContext } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { PremiumFeatureGuard } from "@/components/subscription/PremiumFeatureGuard";
import { FeatureUsageTracker } from "@/components/subscription/FeatureUsageTracker";

function computeCurrentMonthKey(): number {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

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
  const {} = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Update time remaining every minute when boosted
  useEffect(() => {
    if (!profile?.boostedUntil) return;

    const updateTime = () => {
      if (profile.boostedUntil && profile.boostedUntil > Date.now()) {
        setTimeRemaining(formatTimeRemaining(profile.boostedUntil));
      } else {
        setTimeRemaining("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [profile?.boostedUntil]);

  if (isLoading || !profile) {
    return null;
  }

  const handleBoost = async () => {
    setLoading(true);
    try {
      const result = await boostProfile();
      showSuccessToast(
        `Profile boosted for 24 hours! Your profile will appear first in search results. (${result.boostsRemaining ?? 0} boosts left this month)`
      );
      await refetchProfileStatus?.();
    } catch (error: unknown) {
      showErrorToast(error, "Boost failed");
    } finally {
      setLoading(false);
    }
  };

  let boostsRemaining = profile.boostsRemaining ?? 0;
  if (
    typeof profile.boostsMonth === "number" &&
    profile.boostsMonth !== computeCurrentMonthKey()
  ) {
    boostsRemaining = 5; // reset quota client-side if month changed
  }

  const isCurrentlyBoosted =
    !!profile.boostedUntil && profile.boostedUntil > Date.now();
  const disabled = loading || boostsRemaining <= 0 || isCurrentlyBoosted;

  if (isCurrentlyBoosted) {
    return (
      <div className="space-y-2">
        <Badge className="bg-pink-600 text-white flex items-center gap-1">
          <Zap className="h-3 w-3 fill-current" />
          Profile Boosted
        </Badge>
        {timeRemaining && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </div>
        )}
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
            variant={boostsRemaining > 0 ? "default" : "secondary"}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {loading ? (
              <LoadingSpinner size={16} className="mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            Boost Profile (24h)
          </Button>
          <div className="text-xs text-gray-500">
            {boostsRemaining > 0
              ? `${boostsRemaining} boost${boostsRemaining === 1 ? "" : "s"} remaining this month`
              : "No boosts remaining this month"}
          </div>
        </div>
      </FeatureUsageTracker>
    </PremiumFeatureGuard>
  );
};

export default ProfileBoostButton;
