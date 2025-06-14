"use client";

import { useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { boostProfile } from "@/lib/utils/profileApi";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Rocket } from "lucide-react";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useAuthContext } from "@/components/AuthProvider";

const ProfileBoostButton = () => {
  const { profile, refetchProfileStatus, isLoading } = useProfileContext();
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(false);

  if (isLoading || !profile || profile.subscriptionPlan !== "premiumPlus") {
    return null;
  }

  const handleBoost = async () => {
    setLoading(true);
    try {
      if (!token) throw new Error("No token");
      const result = await boostProfile(token);
      showSuccessToast(
        `Boost activated! (${result.boostsRemaining ?? 0} boosts left this month)`
      );
      await refetchProfileStatus?.();
    } catch (error: unknown) {
      showErrorToast(error, "Boost failed");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (profile.boostsRemaining ?? 0) <= 0;

  return (
    <Button onClick={handleBoost} disabled={disabled} variant="secondary">
      {loading ? (
        <LoadingSpinner size={16} className="mr-2" />
      ) : (
        <Rocket className="h-4 w-4 mr-2" />
      )}
      Boost my profile
    </Button>
  );
};

export default ProfileBoostButton;
