"use client";

import { useAuthContext } from "@/components/ClerkAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalyticsPage() {
  const { isLoaded, isAdmin } = useAuthContext();

  if (!isLoaded) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorState message="You must be an admin to view analytics." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-600">High-level platform metrics</p>
        </div>
      </div>

      {/* Placeholder stats; wire real metrics later */}
      <DashboardStats loading={false} />

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed analytics with filterable time ranges and breakdowns will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


