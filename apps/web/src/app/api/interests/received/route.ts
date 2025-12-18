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
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId) {
      return errorResponse("Missing userId parameter", 400, { correlationId: ctx.correlationId });
    }
    
    if (requestedUserId !== userId) {
      console.warn("Unauthorized access attempt to received interests", {
        authUserId: userId,
        attemptedUserId: requestedUserId,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Unauthorized: can only view your own interests", 403, { correlationId: ctx.correlationId });
    }

    try {
      // Fetch received interests where current user is the target
      const interestsSnap = await db
        .collection("interests")
        .where("toUserId", "==", userId)
        .get();
      const interests = interestsSnap.docs.map((d: any) => d.data());

      // Enrich with basic profile info
      const enriched = await Promise.all(
        interests.map(async (i: any) => {
          let fromProfile: any = null;
          try {
            const profDoc = await db.collection("users").doc(i.fromUserId).get();
            fromProfile = profDoc.exists ? profDoc.data() : null;
          } catch {}
          return {
            ...i,
            fromProfile: fromProfile
              ? {
                  fullName: fromProfile.fullName || null,
                  city: fromProfile.city || null,
                  profileImageUrls: Array.isArray(fromProfile.profileImageUrls)
                    ? fromProfile.profileImageUrls
                    : [],
                }
              : null,
          };
        })
      );

      return successResponse(enriched, 200, ctx.correlationId);
    } catch (error) {
      console.error("interests/received GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch interests", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "interests_received", maxRequests: 100 }
  }
);
