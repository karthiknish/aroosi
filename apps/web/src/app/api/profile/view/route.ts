import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { recordProfileViewSchema } from "@/lib/validation/apiSchemas/profileView";
import { db } from "@/lib/firebaseAdmin";
import { adminFieldValue } from "@/lib/firebaseAdminInit";
import {
  createInAppNotification,
  sendFcmNotificationToTokens,
} from "@/lib/notifications/firebaseNotifications";

function dayKey(ts: number = nowTimestamp()) {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

/**
 * POST  /api/profile/view
 * Body: { profileId: string }
 * Records that the authenticated user viewed the given profile.
 */
export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: import("zod").infer<typeof recordProfileViewSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const { profileId } = body;
      
      if (profileId === userId) {
        return successResponse({ ignored: true }, 200, ctx.correlationId);
      }
      
      await db.collection("profileViews").add({
        profileId,
        viewerId: userId,
        createdAt: nowTimestamp(),
      });
      
      // Increment aggregate counter on target profile
      const targetRef = db.collection("users").doc(profileId);
      await targetRef
        .set({ totalProfileViews: adminFieldValue.increment(1) }, { merge: true })
        .catch(() => {});
        
      // Optional notification: only if target user has premiumPlus plan
      const targetDoc = await targetRef.get();
      const targetData = targetDoc.exists ? (targetDoc.data() as any) : null;
      const isPremiumPlus = targetData?.subscriptionPlan === "premiumPlus";
      
      if (isPremiumPlus) {
        // Rate limit: once per viewer per day per target
        const dk = dayKey();
        const rlId = `${profileId}_${userId}_${dk}`;
        const rlRef = db.collection("profileViewNotifsSent").doc(rlId);
        const rlSnap = await rlRef.get();
        
        if (!rlSnap.exists) {
          await rlRef.set({
            targetUserId: profileId,
            viewerId: userId,
            dayKey: dk,
            createdAt: nowTimestamp(),
          });
          
          await createInAppNotification({
            userId: profileId,
            type: "profile_view",
            title: "Your profile was viewed",
            body: "Someone just viewed your profile",
            data: { viewerId: userId },
          });
          
          const tokenSnap = await db
            .collection("pushTokens")
            .where("userId", "==", profileId)
            .where("isActive", "==", true)
            .get();
          const tokens = tokenSnap.docs
            .map((d: any) => (d.data() as any).token)
            .filter(Boolean);
            
          if (tokens.length) {
            await sendFcmNotificationToTokens(
              tokens,
              "Profile viewed",
              "Someone viewed your profile",
              { viewerId: userId }
            );
          }
        }
      }
      
      return successResponse(undefined, 200, ctx.correlationId);
    } catch (err: any) {
      console.error("profile/view POST error", {
        error: err?.message,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to record view", 400, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: recordProfileViewSchema,
    rateLimit: { identifier: "profile_view_post", maxRequests: 100 }
  }
);

/**
 * GET  /api/profile/view?profileId=xyz
 * Returns the list of viewers for the given profile (Premium Plus owner only).
 */
export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const { searchParams } = new URL(ctx.request.url);
      const profileId = searchParams.get("profileId");
      const mode = searchParams.get("mode");
      const filter = searchParams.get("filter") || "all";
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const offset = parseInt(searchParams.get("offset") || "0", 10);
      
      if (!profileId) {
        return errorResponse("Missing profileId", 400, { correlationId: ctx.correlationId });
      }
      
      // Authorization: users can view their own viewers only
      if (profileId !== userId) {
        return errorResponse("Forbidden", 403, { correlationId: ctx.correlationId });
      }

      // Calculate time filter cutoff
      const now = nowTimestamp();
      let cutoffTime = 0;
      switch (filter) {
        case "today":
          const todayStart = new Date(nowTimestamp());
          todayStart.setHours(0, 0, 0, 0);
          cutoffTime = todayStart.getTime();
          break;
        case "week":
          cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case "month":
          cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
          break;
        default:
          cutoffTime = 0;
      }

      // Fetch all views for this profile
      const snap = await db
        .collection("profileViews")
        .where("profileId", "==", profileId)
        .orderBy("createdAt", "desc")
        .get();
      
      let rows = snap.docs.map((d: any) => d.data() as any);
      
      // Apply time filter
      if (cutoffTime > 0) {
        rows = rows.filter((r: any) => r.createdAt >= cutoffTime);
      }

      // Get user's lastSeenViewersAt timestamp
      const userDoc = await db.collection("users").doc(profileId).get();
      const userData = userDoc.exists ? (userDoc.data() as any) : {};
      const lastSeenAt = userData.lastSeenViewersAt || 0;

      if (mode === "count") {
        // Count unique viewers and new viewers
        const uniqueViewers = new Set(rows.map((r: any) => r.viewerId));
        const newViewers = rows.filter((r: any) => r.createdAt > lastSeenAt);
        const uniqueNewViewers = new Set(newViewers.map((r: any) => r.viewerId));
        
        return successResponse({
          count: uniqueViewers.size,
          newCount: uniqueNewViewers.size,
        }, 200, ctx.correlationId);
      }

      // Deduplicate: group by viewerId, keep most recent, count views
      const viewerMap = new Map<string, { viewerId: string; viewedAt: number; viewCount: number; isNew: boolean }>();
      
      for (const row of rows) {
        const existing = viewerMap.get(row.viewerId);
        const isNew = row.createdAt > lastSeenAt;
        
        if (!existing) {
          viewerMap.set(row.viewerId, {
            viewerId: row.viewerId,
            viewedAt: row.createdAt,
            viewCount: 1,
            isNew,
          });
        } else {
          existing.viewCount++;
          if (row.createdAt > existing.viewedAt) {
            existing.viewedAt = row.createdAt;
          }
          if (isNew) {
            existing.isNew = true;
          }
        }
      }

      // Convert to array and sort by most recent
      const dedupedViewers = Array.from(viewerMap.values()).sort(
        (a, b) => b.viewedAt - a.viewedAt
      );

      const total = dedupedViewers.length;
      const newCount = dedupedViewers.filter((v) => v.isNew).length;

      // Apply pagination
      const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
      const end = Number.isFinite(limit) && limit > 0 ? start + limit : undefined;
      const slice = dedupedViewers.slice(start, end);

      // Enrich with viewer profile details
      const viewers = await Promise.all(
        slice.map(async (v) => {
          const uDoc = await db.collection("users").doc(v.viewerId).get();
          const u = uDoc.exists ? (uDoc.data() as any) : {};
          return {
            viewerId: v.viewerId,
            fullName: u?.fullName || null,
            profileImageUrls: u?.profileImageUrls || [],
            age: u?.age || null,
            city: u?.city || u?.location?.city || null,
            viewedAt: v.viewedAt,
            viewCount: v.viewCount,
            isNew: v.isNew,
          };
        })
      );

      return successResponse({
        viewers,
        total,
        newCount,
        hasMore: end ? end < total : false,
      }, 200, ctx.correlationId);
    } catch (err: any) {
      console.error("profile/view GET error", {
        error: err?.message,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch viewers", 400, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "profile_view_get", maxRequests: 30 }
  }
);
