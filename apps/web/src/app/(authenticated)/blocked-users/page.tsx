"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldCheck, Users, ExternalLink } from "lucide-react";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useSafety";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import Link from "next/link";


export default function BlockedUsersPage() {
  const {
    data: pages,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBlockedUsers(25);

  const items = pages ? pages.pages.flatMap((p) => p.blockedUsers) : [];
  const unblockUserMutation = useUnblockUser();

  const handleUnblock = (userId: string) => {
    unblockUserMutation.mutate(userId);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          message="Failed to load blocked users"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          Blocked Users
        </h1>
        <p className="text-gray-600">
          Manage users you&apos;ve blocked. Blocked users cannot send you
          messages or see your profile.
        </p>
      </div>

      {/* Safety Guidelines Link */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">
                  Need help staying safe?
                </h3>
                <p className="text-sm text-blue-700">
                  Learn about our safety features and get tips for online
                  dating.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/safety-guidelines">
                <ExternalLink className="h-4 w-4 mr-2" />
                Safety Guidelines
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Users List */}
      {!items || items.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              message="No blocked users"
              description="You haven't blocked anyone yet. When you block someone, they'll appear here and you can unblock them at any time."
            />
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link href="/safety-guidelines">
                  Learn about safety features
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {items.length} blocked user{items.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {items.map((blockedUser) => (
            <Card key={blockedUser.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Profile Image */}
                  <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {blockedUser.blockedProfile?.profileImageUrl ? (
                      <img
                        src={blockedUser.blockedProfile.profileImageUrl}
                        alt={blockedUser.blockedProfile.fullName || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {blockedUser.blockedProfile?.fullName ||
                        blockedUser.blockedUserId ||
                        "Unknown User"}
                    </h3>
                    <p className="text-sm text-gray-500 flex flex-col">
                      <span>
                        Blocked on{" "}
                        {new Date(blockedUser.createdAt).toLocaleDateString()}
                      </span>
                      {blockedUser.isBlockedBy && (
                        <span className="text-red-600 font-medium">
                          You are blocked by this user
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Unblock Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(blockedUser.blockedUserId)}
                    disabled={unblockUserMutation.isPending}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    {unblockUserMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-green-600 border-t-transparent rounded-full" />
                        Unblocking...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Unblock
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            About Blocking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-2">When you block someone:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>They can&apos;t send you messages or interests</li>
              <li>You won&apos;t see each other in search results</li>
              <li>Existing conversations are hidden</li>
              <li>They won&apos;t know they&apos;ve been blocked</li>
            </ul>
          </div>
          <div className="text-sm text-gray-700">
            <h4 className="font-medium mb-2">When you unblock someone:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>They can contact you again</li>
              <li>You&apos;ll both appear in search results</li>
              <li>Previous conversations remain hidden</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
