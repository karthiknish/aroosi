"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { fetchProfileViewers } from "@/lib/utils/profileApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ProfileViewersPage() {
  const { token, profile } = useAuthContext();
  const router = useRouter();

  const enabled = Boolean(token && profile?._id);

  const {
    data: viewers = [],
    isLoading,
    isError,
  } = useQuery<{ _id: string; email?: string }[]>({
    queryKey: ["profileViewers", profile?._id],
    queryFn: async () => {
      if (!token || !profile?._id) return [];
      return (await fetchProfileViewers({
        token,
        profileId: profile._id as unknown as string,
      })) as {
        _id: string;
        email?: string;
      }[];
    },
    enabled,
  });

  // Redirect non-premiumPlus users back to profile
  if (profile && profile.subscriptionPlan !== "premiumPlus") {
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
          ) : viewers.length === 0 ? (
            <p className="text-sm text-gray-600">
              No one has viewed your profile yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {viewers.map((v) => (
                <li key={v._id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 uppercase">
                    {v.email?.[0] ?? "U"}
                  </div>
                  <Link
                    href={`/profile/${v._id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {v.email ?? v._id}
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
