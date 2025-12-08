import { useQuery } from "@tanstack/react-query";

export interface DashboardStatsPayload {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  messagesCount: number;
  newRegistrations: number;
  contactMessages: number;
  blogPosts: number;
  approvalsPending: number;
}

export interface ActivityItem {
  id: string;
  type: "registration" | "match" | "message" | "blog" | "approval";
  title: string;
  description: string;
  timestamp: Date;
  user?: { name: string };
  status?: "pending" | "approved" | "rejected";
}

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
      return isNaN(value.getTime()) ? new Date() : value;
    }
  }

  // ISO string
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // Unix timestamp (number)
  if (typeof value === "number") {
    // If it's in seconds (< year 2100 in ms = ~4102444800000)
    const d = value < 4102444800000 && value > 1e12
      ? new Date(value)  // Already in ms
      : new Date(value * 1000);  // In seconds
    return isNaN(d.getTime()) ? new Date() : d;
  }

  return new Date();
}

export function useAdminDashboardData() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<DashboardStatsPayload> => {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed stats");
      const json = await res.json();
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

      // Process Profiles (Registrations)
      // API returns: { success: true, data: { profiles: [...], total, ... } }
      try {
        if (profilesRes.ok) {
          const pJson = await profilesRes.json();
          // Handle both wrapped { data: { profiles } } and direct { profiles } format
          const profiles = pJson?.data?.profiles || pJson?.profiles || [];
          profiles.slice(0, 5).forEach((p: any, idx: number) => {
            const profileId = p.id || p._id || p.uid || `idx_${idx}_${Date.now()}`;
            activities.push({
              id: `reg_${profileId}`,
              type: "registration",
              title: "New Registration",
              description: p.fullName || p.email || profileId,
              timestamp: parseTimestamp(p.createdAt),
              user: { name: p.fullName || p.email || profileId },
              status: "pending",
            });
          });
        }
      } catch { }

      // Process Matches
      // API returns: { success: true, matches: [{ profileId, matches: [...] }] }
      try {
        if (matchesRes.ok) {
          const mJson = await matchesRes.json();
          const raw = (mJson?.matches || mJson?.data?.matches || []) as any[];

          // Take first 5 matches
          raw.slice(0, 5).forEach((item: any) => {
            if (item && Array.isArray(item.matches) && item.profileId) {
              // This is grouped format: { profileId, matches: [...] }
              const partner = item.matches[0] || {};
              const left = item.profileId;
              const right = partner._id || partner.id || "unknown";
              const nameA = partner._rootName || item.rootName || left?.slice?.(-6) || "User A";
              const nameB = partner.fullName || partner.name || right?.slice?.(-6) || "User B";
              const id = `match_${left}_${right}`;
              activities.push({
                id,
                type: "match",
                title: "New Match",
                description: `${nameA} & ${nameB}`,
                timestamp: parseTimestamp(item.createdAt || partner.createdAt),
              });
            } else if (item?.user1Id && item?.user2Id) {
              // Direct match format: { user1Id, user2Id, ... }
              const id = item?.id || `${item.user1Id}_${item.user2Id}`;
              const nameA = item?.user1Name || String(item.user1Id).slice(-6) || "User A";
              const nameB = item?.user2Name || String(item.user2Id).slice(-6) || "User B";
              activities.push({
                id: `match_${id}`,
                type: "match",
                title: "New Match",
                description: `${nameA} & ${nameB}`,
                timestamp: parseTimestamp(item?.createdAt),
              });
            }
          });
        }
      } catch { }

      // Process Contact Messages
      // API may return: [{ ... }] or { data: [...] }
      try {
        if (contactRes.ok) {
          const cJson = await contactRes.json();
          const contacts = cJson?.data || (Array.isArray(cJson) ? cJson : cJson?.messages || []);
          contacts.slice(0, 5).forEach((c: any) =>
            activities.push({
              id: `contact_${c._id || c.id}`,
              type: "message",
              title: "Contact Message",
              description: c.subject || c.email,
              timestamp: parseTimestamp(c.createdAt),
              user: { name: c.name || c.email },
              status: "pending",
            })
          );
        }
      } catch { }

      // Process Blog Posts
      // API may return: { posts: [...] } or { data: { posts: [...] } }
      try {
        if (blogRes.ok) {
          const bJson = await blogRes.json();
          const posts = bJson?.data?.posts || bJson?.posts || (Array.isArray(bJson) ? bJson : []);
          posts.slice(0, 5).forEach((b: any) =>
            activities.push({
              id: `blog_${b._id || b.id || b.slug}`,
              type: "blog",
              title: "Blog Post",
              description: b.title,
              timestamp: parseTimestamp(b.createdAt || b.publishedAt),
            })
          );
        }
      } catch { }

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
