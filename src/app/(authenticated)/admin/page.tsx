"use client";

import { DashboardStats } from "@/components/admin/DashboardStats";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { QuickActions } from "@/components/admin/QuickActions";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";

export default function AdminPage() {
  useAuthContext();
  const { stats, statsLoading, recentActivity, activityLoading } = useAdminDashboardData();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Welcome back, Admin
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl">
          Here's what's happening on your platform today. You have {stats?.approvalsPending || 0} pending approvals and {stats?.contactMessages || 0} new messages.
        </p>
      </div>

      {/* Statistics Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Platform Overview
          </h2>
          <span className="text-sm text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
        <DashboardStats loading={statsLoading} stats={stats} />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-2 space-y-6">
          <RecentActivity
            loading={activityLoading}
            activities={recentActivity}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
