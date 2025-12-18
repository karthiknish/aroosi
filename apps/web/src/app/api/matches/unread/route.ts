import { NextResponse } from "next/server";
import {
  createAuthenticatedHandler,
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

      return NextResponse.json(
        { success: true, data: { counts }, correlationId: ctx.correlationId },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("matches/unread GET error", {
        error: msg,
        correlationId: ctx.correlationId,
      });
      return NextResponse.json(
        { success: false, error: "Failed to compute unread counts", correlationId: ctx.correlationId },
        { status: 500 }
      );
    }
  },
  {
    rateLimit: { identifier: "matches_unread", maxRequests: 60 }
  }
);
