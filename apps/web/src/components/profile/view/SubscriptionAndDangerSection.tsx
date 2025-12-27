import React from "react";
import { useRouter } from "next/navigation";
import { Heart, AlertTriangle } from "lucide-react";
import { DisplaySection } from "./ProfileViewComponents";
import { Button } from "@/components/ui/button";
import { isPremium, isPremiumPlus } from "@/lib/utils/subscriptionPlan";
import { planDisplayName } from "@/lib/utils/plan";
import { subscriptionAPI } from "@/lib/api/subscription";
import type { Profile } from "@aroosi/shared/types";

interface SubscriptionAndDangerSectionProps {
  profileData: Profile;
  plan: any;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

export const SubscriptionAndDangerSection: React.FC<SubscriptionAndDangerSectionProps> = ({
  profileData,
  plan,
  onDeleteAccount,
  isDeleting,
}) => {
  const router = useRouter();

  const handleOpenBillingPortal = async () => {
    try {
      await subscriptionAPI.openBillingPortal();
    } catch {
      router.push("/subscription");
    }
  };

  return (
    <>
      <DisplaySection
        title={
          <span className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" /> Subscription
          </span>
        }
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-md font-semibold">
            {planDisplayName(plan)}
          </span>
          {isPremium(plan) && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary-dark border border-primary/30 flex items-center gap-1">
              {profileData.subscriptionExpiresAt &&
              profileData.subscriptionExpiresAt > Date.now() ? (
                <>
                  Renews{" "}
                  {new Date(
                    profileData.subscriptionExpiresAt
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              ) : (
                <>Expired</>
              )}
            </span>
          )}

          {!isPremium(plan) && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary-dark text-white rounded-lg"
              onClick={() => router.push("/plans")}
            >
              Upgrade
            </Button>
          )}

          {isPremium(plan) && !isPremiumPlus(plan) && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-primary border-primary"
                onClick={() => router.push("/plans")}
              >
                Upgrade to Plus
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenBillingPortal}
                title="Open Stripe Billing Portal"
              >
                Manage
              </Button>
            </div>
          )}

          {isPremiumPlus(plan) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenBillingPortal}
              title="Open Stripe Billing Portal"
            >
              Manage Subscription
            </Button>
          )}
        </div>

        {!isPremiumPlus(plan) && (
          <div className="mt-2 text-xs text-accent-dark">
            Boost visibility & attract more matches with Spotlight.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => (window.location.href = "/subscription")}
              title="Upgrade to Premium Plus for Spotlight and unlimited boosts"
            >
              Upgrade to unlock
            </button>
          </div>
        )}
        {isPremium(plan) && profileData.subscriptionExpiresAt && (
          <div className="mt-3 text-xs text-neutral-light flex flex-wrap items-center gap-2">
            <span>
              {(() => {
                const ms =
                  profileData.subscriptionExpiresAt! - Date.now();
                if (ms <= 0) return "Your subscription has expired.";
                const days = Math.floor(ms / 86400000);
                if (days > 1)
                  return `${days} days remaining in your billing period.`;
                if (days === 1)
                  return `1 day remaining in your billing period.`;
                const hours = Math.floor(ms / 3600000);
                if (hours > 1) return `${hours} hours remaining.`;
                const minutes = Math.max(1, Math.floor(ms / 60000));
                return `${minutes} minute${minutes === 1 ? "" : "s"} remaining.`;
              })()}
            </span>
            <button
              type="button"
              onClick={handleOpenBillingPortal}
              className="underline text-primary"
            >
              Manage
            </button>
          </div>
        )}
      </DisplaySection>

      <DisplaySection
        title={
          <span className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" /> Danger zone
          </span>
        }
        noBorder
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30">
          <div className="text-sm text-danger">
            Permanently delete your profile and all related data. This
            action cannot be undone.
          </div>
          <Button
            className="bg-danger hover:bg-danger text-white"
            onClick={onDeleteAccount}
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            title="Delete Profile"
          >
            Delete Profile
          </Button>
        </div>
      </DisplaySection>
    </>
  );
};
