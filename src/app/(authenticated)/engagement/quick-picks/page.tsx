"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import Image from "next/image";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const { data: subscription } = useSubscriptionStatus();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quick-picks", { dayKey }],
    queryFn: () => getQuickPicks(dayKey),
  });
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: fetchIcebreakers,
  });

  useEffect(() => {
    if (isError) {
      setLoadError("Failed to load quick picks. Please try again.");
      showErrorToast("Failed to load quick picks. Please try again.");
    } else {
      setLoadError(null);
    }
  }, [isError]);

  const dailyLimit = useMemo(() => {
    const plan = subscription?.plan || "free";
    return plan === "premiumPlus" ? 40 : plan === "premium" ? 20 : 5;
  }, [subscription?.plan]);

  // Sort profiles by "most views today" (fallback to provided order)
  const ordered: QuickPickProfile[] = useMemo(() => {
    const profiles = data?.profiles || [];
    const coalesceViews = (p: any) =>
      Number(
        p?.viewsToday ??
          p?.profileViewsToday ??
          p?.views?.today ??
          p?.views ??
          0
      ) || 0;
    return [...profiles].sort((a, b) => coalesceViews(b) - coalesceViews(a));
  }, [data?.profiles]);

  // Deck ids
  const userIds: string[] = useMemo(
    () =>
      (data?.userIds || []).filter((id) =>
        ordered.some((p) => p.userId === id)
      ),
    [data?.userIds, ordered]
  );

  // Stack of next 3 cards for Tinder-style deck
  const nextCards = useMemo(() => {
    const remainingIds = userIds.slice(index);
    return remainingIds
      .slice(0, 3)
      .map((id) => ordered.find((p) => p.userId === id));
  }, [ordered, userIds, index]);

  // Actions
  const onAction = useCallback(
    async (action: "like" | "skip") => {
      const currentId = userIds[index];
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
    },
    [index, userIds, trackUsage]
  );

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
  }, [onAction]);

  // Touch and mouse swipe
  const startXRef = useRef<number | null>(null);
  const handleStart = (x: number) => (startXRef.current = x);
  const handleEnd = (x: number) => {
    if (startXRef.current == null) return;
    const dx = x - startXRef.current;
    startXRef.current = null;
    if (dx > 50) void onAction("like");
    else if (dx < -50) void onAction("skip");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-80 h-96" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {loadError}
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <div className="text-sm text-gray-600">Daily Quick Picks</div>
          <div className="text-xs text-gray-500">
            {Math.min(index + 1, userIds.length)} / {userIds.length} shown •
            Limit {dailyLimit} ({subscription?.plan || "free"})
          </div>
          {loadError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 inline-block">
              {loadError}
            </div>
          )}
        </div>

        {/* Swipe interaction container (pointer events only; not keyboard interactive) */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className="relative h-[420px] select-none"
          aria-label="Swipe card deck"
          aria-roledescription="Swipe area"
          onPointerDown={(e) =>
            typeof e.clientX === "number" && handleStart(e.clientX)
          }
          onPointerUp={(e) =>
            typeof e.clientX === "number" && handleEnd(e.clientX)
          }
        >
          {nextCards.map((p, i) => {
            if (!p) return null;
            const isTop = i === 0;
            const scale = isTop ? 1 : i === 1 ? 0.96 : 0.92;
            const translateY = isTop ? 0 : i === 1 ? 10 : 20;
            return (
              <Card
                key={p.userId}
                className="absolute inset-0 bg-white rounded-2xl shadow-lg border overflow-hidden"
                style={{
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  zIndex: 10 - i,
                }}
              >
                <CardContent className="p-0 h-full flex flex-col">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.fullName || "Profile"}
                      width={640}
                      height={480}
                      className="w-full h-72 object-cover"
                      priority={isTop}
                    />
                  ) : (
                    <div className="w-full h-72 bg-gray-100" />
                  )}
                  <div className="p-4 flex-1 flex flex-col items-center text-center gap-1">
                    <div className="text-base font-semibold">
                      <Link
                        href={`/profile/${p.userId}`}
                        className="hover:underline"
                      >
                        {p.fullName || "Member"}
                      </Link>
                    </div>
                    <div className="text-xs text-gray-600">
                      {(p as any).city || ""}
                    </div>
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
                    {isTop && (
                      <div className="mt-4 flex gap-4">
                        <Button
                          variant="outline"
                          onClick={() => onAction("skip")}
                        >
                          Skip
                        </Button>
                        <Button onClick={() => onAction("like")}>Like</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {userIds.length === 0 && (
          <div className="text-sm text-gray-700 text-center mt-4">
            You&apos;re all caught up!
          </div>
        )}
      </div>
    </div>
  );
}


