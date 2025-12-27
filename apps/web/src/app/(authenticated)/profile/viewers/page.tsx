"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { profileAPI } from "@/lib/api/profile";
import type { ProfileViewer, ViewerFilter } from "@aroosi/shared/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { isPremiumPlus } from "@/lib/utils/subscriptionPlan";

const FILTERS: { key: ViewerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function formatRelativeTime(timestamp: number | string | Date): string {
  const ts =
    typeof timestamp === "number"
      ? timestamp
      : timestamp instanceof Date
        ? timestamp.getTime()
        : Number.isFinite(Number(timestamp))
          ? Number(timestamp)
          : Date.parse(timestamp);

  if (!Number.isFinite(ts)) return "";

  const now = Date.now();
  const diffMs = now - ts;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ProfileViewersPage() {
  const { profile: rawProfile } = useAuthContext();
  const profile = rawProfile as {
    _id?: string;
    subscriptionPlan?: string;
  } | null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ViewerFilter>("all");

  const enabled = Boolean(profile?._id);

  const {
    data: viewersData,
    isLoading,
    isError,
  } = useQuery<{
    viewers: ProfileViewer[];
    total?: number;
    newCount?: number;
    hasMore?: boolean;
  }>({
    queryKey: ["profileViewers", profile?._id, activeFilter],
    queryFn: async () => {
      if (!profile?._id) return { viewers: [], total: 0 };
      const json = await profileAPI.getViewers({
        profileId: profile._id as unknown as string,
        limit: 50,
        offset: 0,
        filter: activeFilter,
      });

      const raw = (json?.viewers ?? json?.data?.viewers ?? []) as any[];
      const mapped: ProfileViewer[] = raw.map((v) => ({
        userId: (v?.viewerId ?? v?.userId ?? v?._id ?? "") as string,
        fullName: (v?.fullName ?? null) as string | null,
        profileImageUrls: (v?.profileImageUrls ?? null) as string[] | null,
        age: (v?.age ?? null) as number | null,
        city: (v?.city ?? null) as string | null,
        viewedAt: Number(v?.viewedAt ?? v?.createdAt ?? Date.now()),
        viewCount: v?.viewCount ?? 1,
        isNew: v?.isNew ?? false,
      }));

      return {
        viewers: mapped,
        total: typeof json?.total === "number" ? (json.total as number) : undefined,
        newCount: typeof json?.newCount === "number" ? (json.newCount as number) : undefined,
        hasMore: json?.hasMore ?? false,
      };
    },
    enabled,
  });

  // Mark viewers as seen on mount
  useEffect(() => {
    profileAPI.markViewsAsSeen().catch(() => {});
  }, []);

  // Redirect non-premiumPlus users back to profile
  if (profile && !isPremiumPlus(profile.subscriptionPlan)) {
    if (typeof window !== "undefined") router.replace("/profile");
    return null;
  }

  const viewers = viewersData?.viewers ?? [];
  const newCount = viewersData?.newCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center pt-16 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Who viewed your profile</CardTitle>
              {newCount > 0 && (
                <Badge variant="default" className="bg-primary text-base-light">
                  {newCount} new
                </Badge>
              )}
            </div>
            {viewersData?.total && (
              <span className="text-sm text-muted-foreground">
                {viewersData.total} total
              </span>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {FILTERS.map(({ key, label }) => (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-danger">Failed to load viewers.</p>
          ) : viewers.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">👀</span>
              <p className="text-sm text-neutral-light mt-2">
                {activeFilter === "all"
                  ? "No one has viewed your profile yet."
                  : `No views ${activeFilter === "today" ? "today" : activeFilter === "week" ? "this week" : "this month"}.`}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {viewers.map((v) => (
                <li
                  key={v.userId}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors relative"
                >
                  {/* New indicator */}
                  {v.isNew && (
                    <Badge
                      variant="default"
                      className="absolute -top-1 -right-1 text-xs bg-primary"
                    >
                      NEW
                    </Badge>
                  )}

                  {/* Avatar */}
                  {v.profileImageUrls?.[0] ? (
                    <Image
                      src={v.profileImageUrls[0]}
                      alt={v.fullName || "Viewer"}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground uppercase">
                      {v.fullName?.[0] ?? "U"}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${v.userId}`}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
                    >
                      {v.fullName ?? v.userId}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v.age && <span>{v.age} yrs</span>}
                      {v.city && (
                        <span className="flex items-center gap-0.5">
                          📍 {v.city}
                        </span>
                      )}
                      {v.viewCount && v.viewCount > 1 && (
                        <span className="text-primary">
                          Viewed {v.viewCount}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(v.viewedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
