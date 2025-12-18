import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    
    // Pagination params
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const cursor = searchParams.get("cursor");

    try {
      let queryRef: FirebaseFirestore.Query = db
        .collection("blocks")
        .where("blockerId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit);
        
      if (cursor) {
        try {
          const cursorDoc = await db.collection("blocks").doc(cursor).get();
          if (cursorDoc.exists) queryRef = queryRef.startAfter(cursorDoc);
        } catch {}
      }
      
      const snap = await queryRef.get();
      let blockedUsers = snap.docs.map((d: any) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Enrich with profile data
      const uniqueTargetIds = Array.from(
        new Set(blockedUsers.map((b) => b.blockedUserId).filter(Boolean))
      ) as string[];
      
      if (uniqueTargetIds.length) {
        const profileSnaps = await Promise.all(
          uniqueTargetIds.map((uid) => db.collection("users").doc(uid).get())
        );
        const profileMap = new Map(
          profileSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as any])
        );
        
        blockedUsers = await Promise.all(
          blockedUsers.map(async (b) => {
            let isBlockedBy = false;
            try {
              const reverse = await db.collection("blocks").doc(`${b.blockedUserId}_${userId}`).get();
              isBlockedBy = reverse.exists;
            } catch {}
            return {
              ...b,
              isBlockedBy,
              blockedProfile: profileMap.has(b.blockedUserId)
                ? {
                    fullName: profileMap.get(b.blockedUserId)?.fullName,
                    profileImageUrl: (profileMap.get(b.blockedUserId)?.profileImageUrls || [])[0],
                  }
                : undefined,
            };
          })
        );
      }

      const nextCursor = blockedUsers.length === limit
        ? blockedUsers[blockedUsers.length - 1].id
        : null;

      return successResponse({
        blockedUsers,
        nextCursor,
      }, 200, ctx.correlationId);
    } catch (e) {
      console.error("safety/blocked error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch blocked users", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "safety_blocked", maxRequests: 50 }
  }
);
