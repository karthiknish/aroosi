"use client";

import { DashboardStats } from "@/components/admin/DashboardStats";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { QuickActions } from "@/components/admin/QuickActions";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
interface DashboardStatsPayload {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  messagesCount: number;
  newRegistrations: number;
  contactMessages: number;
  blogPosts: number;
  approvalsPending: number;
}

interface ActivityItem {
  id: string;
  type: "registration" | "match" | "message" | "blog" | "approval";
  title: string;
  description: string;
  timestamp: Date;
  user?: { name: string };
}

export default function AdminPage() {
  useAuthContext();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<DashboardStatsPayload> => {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed stats");
      const json = await res.json();
      // Support both { success, stats } and plain stats
      return (
        (json?.stats as DashboardStatsPayload) ||
        (json as DashboardStatsPayload)
      );
    },
    staleTime: 60_000,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Parallel lightweight fetches
      const [profilesRes, matchesRes, contactRes, blogRes] = await Promise.all([
        fetch(
          "/api/admin/profiles?page=1&pageSize=10&sortBy=createdAt&sortDir=desc",
          { credentials: "include" }
        ),
        fetch("/api/admin/matches", { credentials: "include" }),
        fetch("/api/contact?page=1&pageSize=10", { credentials: "include" }),
        fetch("/api/blog?limit=10", { credentials: "include" }),
      ]);
      const activities: ActivityItem[] = [];
      try {
        if (profilesRes.ok) {
          const pJson = await profilesRes.json();
          (pJson.profiles || []).slice(0, 5).forEach((p: any) =>
            activities.push({
              id: `reg_${p.id}`,
              type: "registration",
              title: "New Registration",
              description: p.fullName || p.email || p.id,
              timestamp: new Date(p.createdAt || Date.now()),
              user: { name: p.fullName || p.email || p.id },
            })
          );
        }
      } catch {}
      try {
        if (matchesRes.ok) {
          const mJson = await matchesRes.json();
          const raw = (mJson?.matches || []) as any[];
          // Handle two shapes:
          // 1) Edge list: { id, userA, userB, createdAt }
          // 2) Grouped: { profileId, matches: [{ _id, fullName, ... }] }
          raw.slice(0, 5).forEach((item: any) => {
            if (item && Array.isArray(item.matches) && item.profileId) {
              // Create one representative activity per group using first pair
              const partner = item.matches[0] || {};
              const left = item.profileId;
              const right = partner._id || partner.id || "unknown";
              const nameA =
                partner._rootName ||
                item.rootName ||
                left?.slice?.(-6) ||
                "User A";
              const nameB =
                partner.fullName ||
                partner.name ||
                right?.slice?.(-6) ||
                "User B";
              const id = `match_${left}_${right}`;
              activities.push({
                id,
                type: "match",
                title: "New Match",
                description: `${nameA} & ${nameB}`,
                timestamp: new Date(
                  item.createdAt || partner.createdAt || Date.now()
                ),
              });
            } else {
              const id = item?.id
                ? String(item.id)
                : `${item?.user1Id || item?.a || "x"}_${item?.user2Id || item?.b || "y"}`;
              const nameA =
                item?.userA ||
                item?.a ||
                item?.user1Name ||
                (item?.user1Id ? String(item.user1Id).slice(-6) : "User A");
              const nameB =
                item?.userB ||
                item?.b ||
                item?.user2Name ||
                (item?.user2Id ? String(item.user2Id).slice(-6) : "User B");
              activities.push({
                id: `match_${id}`,
                type: "match",
                title: "New Match",
                description: `${nameA} & ${nameB}`,
                timestamp: new Date(item?.createdAt || Date.now()),
              });
            }
          });
        }
      } catch {}
      try {
        if (contactRes.ok) {
          const cJson = await contactRes.json();
          (cJson || []).slice(0, 5).forEach((c: any) =>
            activities.push({
              id: `contact_${c._id || c.id}`,
              type: "message",
              title: "Contact Message",
              description: c.subject || c.email,
              timestamp: new Date(c.createdAt || Date.now()),
              user: { name: c.name || c.email },
            })
          );
        }
      } catch {}
      try {
        if (blogRes.ok) {
          const bJson = await blogRes.json();
          (bJson.posts || bJson || []).slice(0, 5).forEach((b: any) =>
            activities.push({
              id: `blog_${b._id || b.id}`,
              type: "blog",
              title: "Blog Post",
              description: b.title,
              timestamp: new Date(b.createdAt || Date.now()),
            })
          );
        }
      } catch {}
      // Sort descending by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return activities.slice(0, 15);
    },
    staleTime: 30_000,
  });

  return (
    <>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 border border-pink-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your matrimony platform with comprehensive tools and
            insights.
          </p>
        </div>

        {/* Statistics Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Platform Overview
          </h2>
          <DashboardStats loading={statsLoading} stats={statsData} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity
              loading={activityLoading}
              activities={recentActivity}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </>
  );
}
