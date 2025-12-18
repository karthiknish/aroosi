import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";

type UsageHistoryItem = { feature: string; timestamp: number };

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    
    const days = Math.max(1, Math.min(30, Number(searchParams.get("days") || 7)));
    const limit = Math.max(1, Math.min(1000, Number(searchParams.get("limit") || 200)));
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    try {
      const snap = await db
        .collection(COL_USAGE_EVENTS)
        .where("userId", "==", userId)
        .get();

      const allItems: UsageHistoryItem[] = snap.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          feature: String(data.feature || "unknown"),
          timestamp: Number(data.timestamp || Date.now()),
        };
      });

      // Filter, sort, and limit in memory
      const items = allItems
        .filter((item) => item.timestamp >= cutoff)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return successResponse<UsageHistoryItem[]>(items, 200, ctx.correlationId);
    } catch (error) {
      console.error("subscription/usage-history error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch usage history", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "subscription_usage_history", maxRequests: 30 }
  }
);
