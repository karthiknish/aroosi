"use client";

import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalyticsPage() {
  // Page removed; redirect users to main admin dashboard.
  if (typeof window !== "undefined") {
    window.location.replace("/admin");
  }
  return null;
}


