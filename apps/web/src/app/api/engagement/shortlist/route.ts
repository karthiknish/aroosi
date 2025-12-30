import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import {
  createInAppNotification,
  sendFcmNotificationToTokens,
} from "@/lib/notifications/firebaseNotifications";
import { engagementShortlistToggleSchema } from "@/lib/validation/apiSchemas/engagement";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const snap = await db
        .collection("shortlists")
        .where("fromUserId", "==", userId)
        .get();
        
      const basic: Array<{ id: string; toUserId: string; createdAt: number }> =
        snap.docs.map((d: any) => {
          const data = d.data() as any;
          return {
            id: d.id,
            toUserId: data.toUserId as string,
            createdAt: (data.createdAt as number) || Date.now(),
          };
        });
        
      // Enrich with profile basics
      const uniqueIds = Array.from(new Set(basic.map((r) => r.toUserId)));
      const profileSnaps = await Promise.all(
        uniqueIds.map((uid) => db.collection("users").doc(uid).get())
      );
      const profileMap = new Map(
        profileSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as any])
      );
      
      const enriched = basic.map((r) => {
        const p = profileMap.get(r.toUserId) || {};
        return {
          // Maintain legacy shape expected by fetchShortlists(): userId not toUserId
          userId: r.toUserId,
          createdAt: r.createdAt,
          fullName: p.fullName || null,
          profileImageUrls: p.profileImageUrls || null,
        };
      });
      
      return successResponse(enriched, 200, ctx.correlationId);
    } catch (e: any) {
      console.error("shortlist GET error", {
        error: e?.message,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to fetch shortlist", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "shortlist_get", maxRequests: 30 }
  }
);

export const POST = createAuthenticatedHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof engagementShortlistToggleSchema>
  ) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { toUserId } = body;
    
    if (toUserId === userId) {
      return errorResponse("You can't shortlist yourself", 400, { correlationId: ctx.correlationId });
    }
    
    try {
      const existingSnap = await db
        .collection("shortlists")
        .where("fromUserId", "==", userId)
        .where("toUserId", "==", toUserId)
        .limit(1)
        .get();
        
      if (!existingSnap.empty) {
        // toggle off (remove)
        await existingSnap.docs[0].ref.delete();
        return successResponse({ removed: true }, 200, ctx.correlationId);
      }
      
      // Plan limit enforcement (free 20, premium 200, premiumPlus unlimited)
      const profileDoc = await db.collection("users").doc(userId).get();
      const plan =
        (profileDoc.exists && (profileDoc.data() as any).subscriptionPlan) ||
        "free";
      const limit =
        plan === "premiumPlus" ? Infinity : plan === "premium" ? 200 : 20;
        
      if (Number.isFinite(limit)) {
        const countSnap = await db
          .collection("shortlists")
          .where("fromUserId", "==", userId)
          .get();
        if (countSnap.size >= limit) {
          return errorResponse(
            "You've reached your shortlist limit. Upgrade your plan to add more.",
            400,
            { correlationId: ctx.correlationId, details: { limit } }
          );
        }
      }
      
      await db.collection("shortlists").add({
        fromUserId: userId,
        toUserId,
        createdAt: Date.now(),
      });
      
      // Fetch sender details for enrichment
      const fromDoc = await db.collection("users").doc(userId).get();
      const fromData = fromDoc.exists ? (fromDoc.data() as any) : {};
      const senderName = fromData.fullName || "Someone";
      const senderImageRaw =
        Array.isArray(fromData.profileImageUrls) &&
        fromData.profileImageUrls.length > 0
          ? fromData.profileImageUrls[0]
          : undefined;
          
      const notificationData: Record<string, any> = {
        fromUserId: userId,
        senderName,
      };
      if (senderImageRaw) notificationData.senderImage = senderImageRaw;
      
      // Fetch target user's push tokens
      const tokenSnap = await db
        .collection("pushTokens")
        .where("userId", "==", toUserId)
        .where("isActive", "==", true)
        .get();
      const tokens = tokenSnap.docs
        .map((d: any) => (d.data() as any).token)
        .filter(Boolean);
        
      // Create notification doc
      await createInAppNotification({
        userId: toUserId,
        type: "shortlist",
        title: `${senderName} shortlisted you`,
        body: "You were added to a shortlist",
        data: notificationData,
      });
      
      if (tokens.length) {
        await sendFcmNotificationToTokens(
          tokens,
          "New shortlist",
          `${senderName} shortlisted you`,
          { fromUserId: userId }
        );
      }
      
      return successResponse({ added: true, notified: tokens.length }, 200, ctx.correlationId);
    } catch (e: any) {
      // Map common Firestore / permission issues to user-friendly messages
      const raw = (e?.message || "").toLowerCase();
      let friendly = "Couldn't update shortlist. Please try again.";
      if (raw.includes("permission") || raw.includes("missing or insufficient permissions")) {
        friendly = "You don't have permission to do that.";
      } else if (raw.includes("quota") || raw.includes("resource exhausted")) {
        friendly = "Shortlist temporarily unavailable. Please try again soon.";
      }
      console.error("shortlist POST error", {
        error: e?.message,
        correlationId: ctx.correlationId,
      });
      return errorResponse(friendly, 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: engagementShortlistToggleSchema,
    rateLimit: { identifier: "shortlist_post", maxRequests: 30 }
  }
);
