import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";

async function countCollection(col: string): Promise<number> {
  try {
    // Try aggregation count API if available
    const snap: any = await (db as any).collection(col).count?.().get?.();
    if (snap && typeof snap.data === "function") {
      const data = snap.data();
      if (data && typeof data.count === "number") return data.count;
    }
    // Fallback: limited scan (up to 5k docs)
    const legacy = await db.collection(col).limit(5000).get();
    return legacy.size;
  } catch {
    return 0;
  }
}

export const GET = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { correlationId, user } = ctx;
  const startedAt = nowTimestamp();
  
  // Basic admin role check (handler.ts handles authentication)
  if (user.role !== "admin") {
    return errorResponse("Admin privileges required", 403, { 
      correlationId, 
      code: "FORBIDDEN" 
    });
  }

  try {
    const [
      totalUsers,
      totalMatches,
      messagesCount,
      contactMessages,
      blogPosts,
    ] = await Promise.all([
      // Count user profiles from the canonical users collection
      countCollection("users"),
      countCollection("matches"),
      countCollection("messages"),
      countCollection("contactSubmissions"),
      countCollection("blogPosts"),
    ]);

    // Active users: distinct fromUserId in messages last 30 days
    const THIRTY_DAYS = nowTimestamp() - 30 * 24 * 60 * 60 * 1000;
    let activeUsers = 0;
    try {
      const activitySnap = await db
        .collection("messages")
        .where("createdAt", ">=", THIRTY_DAYS)
        .select("fromUserId")
        .limit(5000)
        .get();
      const ids = new Set<string>();
      activitySnap.forEach((d: any) => {
        const data = d.data();
        if (data?.fromUserId) ids.add(String(data.fromUserId));
      });
      activeUsers = ids.size;
    } catch {}

    // New registrations last 7 days (users collection)
    let newRegistrations = 0;
    try {
      const sevenDays = nowTimestamp() - 7 * 24 * 60 * 60 * 1000;
      const newSnap = await db
        .collection("users")
        .where("createdAt", ">=", sevenDays)
        .select("createdAt")
        .limit(5000)
        .get();
      newRegistrations = newSnap.size;
    } catch {}

    // Pending approvals: users where needsApproval == true (if field exists)
    let approvalsPending = 0;
    try {
      const pendingSnap = await db
        .collection("users")
        .where("needsApproval", "==", true)
        .limit(5000)
        .get();
      approvalsPending = pendingSnap.size;
    } catch {}

    const payload = {
      totalUsers,
      activeUsers,
      totalMatches,
      messagesCount,
      newRegistrations,
      contactMessages,
      blogPosts,
      approvalsPending,
      generatedAt: nowTimestamp(),
      durationMs: nowTimestamp() - startedAt,
    };
    
    return successResponse({ stats: payload }, 200, correlationId);
  } catch (e) {
    console.error("[admin.dashboard] error", { correlationId, error: e });
    return errorResponse("Failed to load dashboard", 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "admin_dashboard", maxRequests: 50 }
});
