import { useQuery } from "@tanstack/react-query";
import { adminDashboardAPI } from "@/lib/api/admin/dashboard";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import { adminMatchesAPI } from "@/lib/api/admin/matches";
import { adminContactAPI } from "@/lib/api/admin/contact";
import { adminBlogAPI } from "@/lib/api/admin/blog";
import { handleError } from "@/lib/utils/errorHandling";

export interface DashboardStatsPayload {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  messagesCount: number;
  newRegistrations: number;
  contactMessages: number;
  blogPosts: number;
  approvalsPending: number;
  isApproximate?: boolean;
}

export interface ActivityItem {
  id: string;
  type: "registration" | "match" | "message" | "blog" | "approval";
  title: string;
  description: string;
  timestamp: Date;
  href?: string;
  user?: { name: string };
  status?: "pending" | "approved" | "rejected";
}

type DashboardProfile = {
  id?: string;
  _id?: string;
  uid?: string;
  fullName?: string;
  email?: string;
  createdAt?: unknown;
};

type DashboardMatch = {
  id?: string;
  user1Id?: string;
  user2Id?: string;
  user1Name?: string;
  user2Name?: string;
  createdAt?: unknown;
  profileId?: string;
  rootName?: string;
  matches?: Array<Record<string, unknown>>;
};

type DashboardContact = {
  _id?: string;
  id?: string;
  subject?: string;
  email?: string;
  name?: string;
  createdAt?: unknown;
};

type DashboardBlogPost = {
  _id?: string;
  id?: string;
  slug?: string;
  title?: string;
  createdAt?: unknown;
  publishedAt?: unknown;
};

/**
 * Parse various timestamp formats into a Date object
 * Handles: Firestore Timestamp objects, ISO strings, Unix timestamps (ms and seconds)
 */
function parseTimestamp(value: unknown): Date {
  if (!value) return new Date();

  // Firestore Timestamp object: { _seconds, _nanoseconds } or { seconds, nanoseconds }
  if (typeof value === "object" && value !== null) {
    const ts = value as Record<string, unknown>;
    const seconds = ts._seconds ?? ts.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
    // It might be a Date object already
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? new Date() : value;
    }
  }

  // ISO string
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  // Unix timestamp (number)
  if (typeof value === "number") {
    // If it's in seconds (< year 2100 in ms = ~4102444800000)
    const d = value < 4102444800000 && value > 1e12
      ? new Date(value)  // Already in ms
      : new Date(value * 1000);  // In seconds
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  return new Date();
}

export function useAdminDashboardData() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminDashboardAPI.getStats(),
    staleTime: 60_000,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const settled = await Promise.allSettled([
        adminProfilesAPI.list({ page: 1, pageSize: 10, sortBy: "createdAt", sortDir: "desc" }),
        adminMatchesAPI.list({ page: 1, pageSize: 10 }),
        adminContactAPI.list({ page: 1, pageSize: 10 }),
        adminBlogAPI.list({ page: 1, pageSize: 10 }),
      ]);

      const profilesData = settled[0].status === "fulfilled" ? settled[0].value : null;
      const matchesData = settled[1].status === "fulfilled" ? settled[1].value : null;
      const contacts = settled[2].status === "fulfilled" ? settled[2].value : [];
      const blogData = settled[3].status === "fulfilled" ? settled[3].value : null;

      if (settled[0].status === "rejected") {
        handleError(settled[0].reason, { scope: "useAdminDashboardData", action: "fetch_profiles" }, { showToast: false });
      }
      if (settled[1].status === "rejected") {
        handleError(settled[1].reason, { scope: "useAdminDashboardData", action: "fetch_matches" }, { showToast: false });
      }
      if (settled[2].status === "rejected") {
        handleError(settled[2].reason, { scope: "useAdminDashboardData", action: "fetch_contacts" }, { showToast: false });
      }
      if (settled[3].status === "rejected") {
        handleError(settled[3].reason, { scope: "useAdminDashboardData", action: "fetch_blog" }, { showToast: false });
      }

      const activities: ActivityItem[] = [];

      // Process Profiles (Registrations)
      try {
        const profiles = (profilesData?.profiles || []) as DashboardProfile[];
        profiles.slice(0, 5).forEach((p, idx) => {
          const profileId = p.id || p._id || p.uid || `idx_${idx}_${Date.now()}`;
          activities.push({
            id: `reg_${profileId}`,
            type: "registration",
            title: "New Registration",
            description: p.fullName || p.email || profileId,
            timestamp: parseTimestamp(p.createdAt),
            href: `/admin/profile/${profileId}`,
            user: { name: p.fullName || p.email || profileId },
            status: "pending",
          });
        });
      } catch (err) {
        handleError(err, { scope: "useAdminDashboardData", action: "process_profiles" }, { showToast: false });
      }

      // Process Matches
      try {
        const raw = (matchesData?.matches || []) as DashboardMatch[];
        raw.slice(0, 5).forEach((item) => {
          if (item && Array.isArray(item.matches) && item.profileId) {
            const partner = (item.matches[0] || {}) as Record<string, unknown>;
            const left = item.profileId;
            const right = String(partner._id || partner.id || "unknown");
            const nameA = String(partner._rootName || item.rootName || left?.slice?.(-6) || "User A");
            const nameB = String(partner.fullName || partner.name || right.slice(-6) || "User B");
            const id = `match_${left}_${right}`;
            activities.push({
              id,
              type: "match",
              title: "New Match",
              description: `${nameA} & ${nameB}`,
              timestamp: parseTimestamp(item.createdAt || partner.createdAt),
              href: "/admin/matches",
            });
          } else if (item?.user1Id && item?.user2Id) {
            const id = item?.id || `${item.user1Id}_${item.user2Id}`;
            const nameA = item?.user1Name || String(item.user1Id).slice(-6) || "User A";
            const nameB = item?.user2Name || String(item.user2Id).slice(-6) || "User B";
            activities.push({
              id: `match_${id}`,
              type: "match",
              title: "New Match",
              description: `${nameA} & ${nameB}`,
              timestamp: parseTimestamp(item?.createdAt),
              href: "/admin/matches",
            });
          }
        });
      } catch (err) {
        handleError(err, { scope: "useAdminDashboardData", action: "process_matches" }, { showToast: false });
      }

      // Process Contact Messages
      try {
        ((Array.isArray(contacts) ? contacts : []) as DashboardContact[])
          .slice(0, 5)
          .forEach((c) => {
            activities.push({
            id: `contact_${c._id || c.id}`,
            type: "message",
            title: "Contact Message",
            description: c.subject || c.email || "New contact message",
            timestamp: parseTimestamp(c.createdAt),
            href: "/admin/contact",
            user: { name: c.name || c.email || "Unknown sender" },
            status: "pending",
            });
          });
      } catch (err) {
        handleError(err, { scope: "useAdminDashboardData", action: "process_contacts" }, { showToast: false });
      }

      // Process Blog Posts
      try {
        const posts = (blogData?.posts || []) as DashboardBlogPost[];
        posts.slice(0, 5).forEach((b) => {
          activities.push({
            id: `blog_${b._id || b.id || b.slug}`,
            type: "blog",
            title: "Blog Post",
            description: b.title || "Untitled post",
            timestamp: parseTimestamp(b.createdAt || b.publishedAt),
            href: "/admin/blog",
          });
        });
      } catch (err) {
        handleError(err, { scope: "useAdminDashboardData", action: "process_blog" }, { showToast: false });
      }

      // Sort descending by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return activities.slice(0, 15);
    },
    staleTime: 30_000,
  });

  return {
    stats,
    statsLoading,
    recentActivity,
    activityLoading,
  };
}
