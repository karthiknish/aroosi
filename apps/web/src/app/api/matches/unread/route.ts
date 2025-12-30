import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

const COLLECTION = "messages";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      // Query messages for the user - use only existing indexes to avoid requiring composite index
      // Note: We removed orderBy("createdAt", "desc") and limit(500) because it requires a composite index
      // on (toUserId ASC, createdAt DESC) which might not exist.
      const snap = await db
        .collection(COLLECTION)
        .where("toUserId", "==", userId)
        .get();

      const counts: Record<string, number> = {};
      snap!.docs.forEach((d: any) => {
        const m = d.data() as { fromUserId?: string; readAt?: number | null };
        // Treat missing readAt or explicit null as unread
        if (!m.readAt) {
          const from = m.fromUserId || "unknown";
          counts[from] = (counts[from] || 0) + 1;
        }
      });

      return successResponse({ counts }, 200, ctx.correlationId, {
        "Cache-Control": "no-store",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("matches/unread GET error", {
        error: msg,
        correlationId: ctx.correlationId,
      });
      return errorResponse("Failed to compute unread counts", 500, {
        correlationId: ctx.correlationId,
      });
    }
  },
  {
    rateLimit: { identifier: "matches_unread", maxRequests: 60 }
  }
);
