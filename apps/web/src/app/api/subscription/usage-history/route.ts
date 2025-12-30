import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext
} from "@/lib/api/handler";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { COL_USAGE_EVENTS } from "@/lib/firestoreSchema";

type UsageHistoryItem = { feature: string; timestamp: number };

export const GET = createAuthenticatedHandler(
  async (ctx: AuthenticatedApiContext) => {
    const { searchParams } = ctx.request.nextUrl;
    const userId = ctx.user.id;
    
    const days = Math.max(1, Math.min(30, Number(searchParams.get("days") || 7)));
    const limit = Math.max(1, Math.min(1000, Number(searchParams.get("limit") || 200)));
    const cutoff = nowTimestamp() - days * 24 * 60 * 60 * 1000;

    try {
      const snap = await db
        .collection(COL_USAGE_EVENTS)
        .where("userId", "==", userId)
        .where("timestamp", ">=", cutoff)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      const items: UsageHistoryItem[] = snap.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          feature: String(data.feature || "unknown"),
          timestamp: Number(data.timestamp || nowTimestamp()),
        };
      });

      return successResponse({ count: items.length, items }, 200, ctx.correlationId);
    } catch (e) {
      console.error("usage-history error", e);
      return errorResponse("Failed to fetch usage history", 500, { correlationId: ctx.correlationId });
    }
  }
);
