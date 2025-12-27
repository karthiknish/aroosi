import React from "react";
import { useRouter } from "next/navigation";
import { Edit3, Camera, BarChart, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardDescription } from "@/components/ui/card";
import { isPremium, isPremiumPlus } from "@/lib/utils/subscriptionPlan";
import { boostProfile } from "@/lib/profile/userProfileApi";
import type { Profile } from "@aroosi/shared/types";

interface ProfileHeaderProps {
  profileData: Profile;
  plan: any;
  currentUserId: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  plan,
  currentUserId,
}) => {
  const router = useRouter();

  return (
    <CardHeader className="border-b pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex-1 min-w-[200px]">
        <h1 className="text-2xl text-neutral-dark font-semibold tracking-tight mb-1 flex items-center gap-2">
          My profile
          {isPremium(plan) && (
            <BadgeCheck className="w-5 h-5 text-accent" />
          )}
        </h1>
        <CardDescription className="text-neutral-light text-sm">
          View and manage your information
        </CardDescription>
      </div>
      <div className="w-full lg:w-auto flex flex-wrap items-stretch gap-2">
        <div className="flex flex-1 lg:flex-none flex-wrap gap-2">
          {isPremiumPlus(plan) ? (
            <Button
              size="sm"
              variant="outline"
              className="text-accent-dark border-accent"
              onClick={async () => {
                try {
                  const boosted =
                    !!profileData.boostedUntil &&
                    (profileData.boostedUntil as number) > Date.now();
                  if (boosted) {
                    router.push("/premium-settings");
                    return;
                  }
                  const result = await boostProfile(currentUserId);
                  try {
                    const { showSuccessToast, showErrorToast } =
                      await import("@/lib/ui/toast");
                    if (result.success) {
                      showSuccessToast(
                        `Profile boosted for 24 hours! (${result.boostsRemaining ?? 0} boosts left this month)`
                      );
                    } else {
                      showErrorToast(result.message, "Boost failed");
                    }
                  } catch {}
                  router.refresh?.();
                } catch (e) {
                  try {
                    const { showErrorToast } = await import(
                      "@/lib/ui/toast"
                    );
                    showErrorToast(e as Error, "Boost failed");
                  } catch {
                    console.warn("Boost failed", e);
                  }
                  router.push("/premium-settings");
                }
              }}
              title="Profile Boost is available on Premium Plus."
            >
              Boost Profile
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-accent-dark border-accent"
              onClick={() => router.push("/subscription")}
              title="Upgrade to Premium Plus to boost your profile"
            >
              Upgrade to Premium Plus to boost
            </Button>
          )}
          <Button
            onClick={() => router.push("/profile/edit")}
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/10 hover:text-primary-dark flex items-center gap-1.5 rounded-full px-4"
            title="Edit Profile Details"
          >
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Profile</span>
          </Button>
          <Button
            onClick={() => router.push("/profile/edit/images")}
            variant="outline"
            size="sm"
            className="border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary-dark flex items-center gap-1.5 rounded-full px-4"
            title="Manage Photos"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </Button>
          <Button
            onClick={() => router.push("/usage")}
            variant="outline"
            size="sm"
            className="border-success text-success hover:bg-success/10 hover:text-success flex items-center gap-1.5 rounded-full px-4"
            title="Usage Analytics"
          >
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Usage</span>
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
