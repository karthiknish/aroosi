"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getQuickPicks,
  actOnQuickPick,
  type QuickPickProfile,
  fetchIcebreakers,
  todayKey,
} from "@/lib/engagementUtil";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";
import { ErrorState } from "@/components/ui/error-state";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  Empty,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";
import Image from "next/image";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { Sparkles } from "lucide-react";

// todayKey imported from engagementUtil instead of local duplicate

export default function QuickPicksPage() {
  const { trackUsage } = useUsageTracking();
  const [dayKey] = useState<string>(todayKey());
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { data: subscription } = useSubscriptionStatus();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["quick-picks", { dayKey }],
    queryFn: () => getQuickPicks(dayKey),
  });
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: fetchIcebreakers,
  });

  useEffect(() => {
    if (!error) {
      setLoadError(null);
      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load quick picks. Please try again.";
    setLoadError(message);
    handleError(
      error,
      { scope: "QuickPicksPage", action: "load_quick_picks" },
      { customUserMessage: message }
    );
  }, [error]);

  const dailyLimit = useMemo(() => {
    const plan = subscription?.plan || "free";
    return plan === "premiumPlus" ? 40 : plan === "premium" ? 20 : 5;
  }, [subscription?.plan]);

  const ordered: QuickPickProfile[] = useMemo(() => {
    const profiles = data?.profiles || [];
    const coalesceViews = (
      profile: QuickPickProfile & {
        viewsToday?: number;
        profileViewsToday?: number;
        views?: number | { today?: number };
      }
    ) =>
      Number(
        profile.viewsToday ??
          profile.profileViewsToday ??
          (typeof profile.views === "object" ? profile.views?.today : undefined) ??
          profile.views ??
          0
      ) || 0;
    return [...profiles].sort((a, b) => coalesceViews(b) - coalesceViews(a));
  }, [data?.profiles]);

  const userIds: string[] = useMemo(
    () =>
      (data?.userIds || []).filter((id) =>
        ordered.some((p) => p.userId === id)
      ),
    [data?.userIds, ordered]
  );

  const nextCards = useMemo(() => {
    const remainingIds = userIds.slice(index);
    return remainingIds
      .slice(0, 3)
      .map((id) => ordered.find((p) => p.userId === id));
  }, [ordered, userIds, index]);

  const onAction = useCallback(
    async (action: "like" | "skip") => {
      const currentId = userIds[index];
      if (!currentId) return;
      try {
        await actOnQuickPick(currentId, action);
        setIndex((i) => i + 1);
        if (action === "like") {
          handleApiOutcome({ success: true, message: "Liked" });
        }
        trackUsage({
          feature: "profile_view",
          metadata: { targetUserId: currentId },
        });
      } catch (error) {
        handleError(
          error,
          { scope: "QuickPicksPage", action: `quick_pick_${action}` },
          {
            customUserMessage:
              error instanceof Error
                ? error.message
                : "Failed to submit action",
          }
        );
      }
    },
    [index, userIds, trackUsage]
  );

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
    return <PageLoader message="Loading your quick picks..." fullScreen={false} />;
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorState
          message={loadError || "Failed to load quick picks. Please try again."}
          onRetry={() => void refetch()}
          className="w-full max-w-md rounded-2xl border border-dashed border-neutral/20 bg-base p-6"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <div className="text-sm text-neutral">Daily Quick Picks</div>
          <div className="text-xs text-neutral-light">
            {Math.min(index + 1, userIds.length)} / {userIds.length} shown •
            Limit {dailyLimit} ({subscription?.plan || "free"})
          </div>
          {loadError && (
            <div className="mt-2 text-xs text-danger bg-danger/5 border border-danger/20 rounded-md px-2 py-1 inline-block">
              {loadError}
            </div>
          )}
        </div>
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
                className="absolute inset-0 bg-base rounded-2xl shadow-lg border overflow-hidden"
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
                    <div className="w-full h-72 bg-neutral/5" />
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
                    <div className="text-xs text-neutral">
                      {p.city || ""}
                    </div>
                    {Array.isArray(iceQs) && iceQs.length > 0 && (
                      <div className="mt-2 flex gap-2 justify-center flex-wrap">
                        {iceQs.slice(0, 2).map((q) => (
                          <span
                            key={q.id}
                            className="text-[10px] px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/20"
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
          <Empty className="mt-4 min-h-[260px] border-neutral/15 bg-base-light/70">
            <EmptyIcon icon={Sparkles} />
            <EmptyTitle>You&apos;re all caught up</EmptyTitle>
            <EmptyDescription>
              There are no more quick picks right now. Check back later or keep browsing profiles.
            </EmptyDescription>
            <Button asChild>
              <Link href="/search">Browse Profiles</Link>
            </Button>
          </Empty>
        )}
      </div>
    </div>
  );
}

