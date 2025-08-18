"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getQuickPicks,
  actOnQuickPick,
  QuickPickProfile,
  fetchIcebreakers,
} from "@/lib/engagementUtil";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import Link from "next/link";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

function todayKey(): string {
  const d = new Date();
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

export default function QuickPicksPage() {
  const { trackUsage } = useUsageTracking();
  const [dayKey] = useState<string>(todayKey());
  const [index, setIndex] = useState(0);
  const { data: subscription } = useSubscriptionStatus();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quick-picks", { dayKey }],
    queryFn: () => getQuickPicks(dayKey),
  });
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: fetchIcebreakers,
  });

  const userIds = data?.userIds || [];
  const profiles = data?.profiles || [];
  const currentId = userIds[index];
  const currentProfile: QuickPickProfile | undefined = profiles.find(
    (p) => p.userId === currentId
  );

  const dailyLimit = useMemo(() => {
    const plan = subscription?.plan || "free";
    return plan === "premiumPlus" ? 40 : plan === "premium" ? 20 : 5;
  }, [subscription?.plan]);

  const onAction = async (action: "like" | "skip") => {
    if (!currentId) return;
    try {
      await actOnQuickPick(currentId, action);
      setIndex((i) => i + 1);
      if (action === "like") showSuccessToast("Liked");
      // Track usage event (quick pick action)
      trackUsage({
        feature: "profile_view",
        metadata: { targetUserId: currentId },
      });
    } catch (e: any) {
      showErrorToast(e?.message ?? "Failed to submit action");
    }
  };

  // Keyboard handlers for left/right arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        void onAction("skip");
      } else if (e.key === "ArrowRight") {
        void onAction("like");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-80 h-80" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent
          className="p-6 flex flex-col gap-4 items-center"
          onTouchStart={(e) =>
            ((e.currentTarget as any)._touchStartX =
              e.changedTouches[0].clientX)
          }
          onTouchEnd={(e) => {
            const start = (e.currentTarget as any)._touchStartX as
              | number
              | undefined;
            if (typeof start !== "number") return;
            const dx = e.changedTouches[0].clientX - start;
            if (dx > 40) {
              void onAction("like");
            } else if (dx < -40) {
              void onAction("skip");
            }
          }}
        >
          <div className="text-sm text-gray-600">Daily Quick Picks</div>
          <div className="text-xs text-gray-500">
            {index + 1} / {userIds.length} shown • Limit {dailyLimit} (
            {subscription?.plan || "free"})
          </div>
          {currentId ? (
            <div className="flex flex-col items-center gap-4 w-full">
              {currentProfile?.imageUrl ? (
                <img
                  src={currentProfile.imageUrl}
                  alt={currentProfile.fullName || "Profile"}
                  className="w-40 h-40 rounded-xl object-cover"
                />
              ) : (
                <div className="w-40 h-40 rounded-xl bg-gray-100" />
              )}
              <div className="text-center">
                <div className="text-sm font-semibold">
                  <Link
                    href={`/profile/${currentId}`}
                    className="hover:underline"
                  >
                    {currentProfile?.fullName || "Member"}
                  </Link>
                </div>
                <div className="text-xs text-gray-600">
                  {currentProfile?.city || ""}
                </div>
                {/* Prompt chips */}
                {Array.isArray(iceQs) && iceQs.length > 0 && (
                  <div className="mt-2 flex gap-2 justify-center flex-wrap">
                    {iceQs.slice(0, 2).map((q) => (
                      <span
                        key={q.id}
                        className="text-[10px] px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200"
                      >
                        {q.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => onAction("skip")}>
                  Skip
                </Button>
                <Button onClick={() => onAction("like")}>Like</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              You&apos;re all caught up!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


