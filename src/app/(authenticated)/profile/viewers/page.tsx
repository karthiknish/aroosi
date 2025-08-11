"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import {
  fetchProfileViewers,
  type ProfileViewer,
} from "@/lib/utils/profileApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { isPremiumPlus } from "@/lib/utils/subscriptionPlan";

export default function ProfileViewersPage() {
  const { profile: rawProfile } = useAuthContext();
  const profile = rawProfile as {
    _id?: string;
    subscriptionPlan?: string;
  } | null;
  const router = useRouter();

  const enabled = Boolean(profile?._id);

  const {
    data: viewersData,
    isLoading,
    isError,
  } = useQuery<{ viewers: ProfileViewer[]; total?: number }>({
    queryKey: ["profileViewers", profile?._id],
    queryFn: async () => {
      if (!profile?._id) return { viewers: [], total: 0 };
      const result = await fetchProfileViewers({
        profileId: profile._id as unknown as string,
        limit: 50,
        offset: 0,
      });
      return result;
    },
    enabled,
  });

  // Redirect non-premiumPlus users back to profile (centralized helper)
  // Prefer helper to avoid string drift and keep semantics consistent.
  // Upsell: show a small inline link to /plans if desired in future.
  if (profile && !isPremiumPlus(profile.subscriptionPlan)) {
    if (typeof window !== "undefined") router.replace("/profile");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-16 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Who viewed your profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-10" />
          ) : isError ? (
            <p className="text-sm text-red-600">Failed to load viewers.</p>
          ) : !viewersData || viewersData.viewers.length === 0 ? (
            <p className="text-sm text-gray-600">
              No one has viewed your profile yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {viewersData.viewers.map((v) => (
                <li key={v.userId} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 uppercase">
                    {v.fullName?.[0] ?? "U"}
                  </div>
                  <Link
                    href={`/profile/${v.userId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {v.fullName ?? v.userId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
