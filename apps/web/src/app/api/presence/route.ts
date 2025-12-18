import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    // Parse optional body for status
    let status = "online";
    try {
      const body = await ctx.request.json();
      if (body && typeof body.status === "string" && ["online", "offline", "away"].includes(body.status)) {
        status = body.status;
      }
    } catch {
      // no body provided (keepalive) -> default to online
    }

    try {
      await db.collection("presence").doc(userId).set(
        { userId, lastSeen: Date.now(), status },
        { merge: true }
      );
      return new Response(null, { status: 204 });
    } catch (e) {
      console.error("presence POST error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("presence update failed", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "presence_update", maxRequests: 120 }
  }
);

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const { searchParams } = new URL(ctx.request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return errorResponse("Missing userId", 400, { correlationId: ctx.correlationId });
    }

    try {
      const doc = await db.collection("presence").doc(userId).get();
      if (!doc.exists) {
        return successResponse({ isOnline: false, lastSeen: 0 }, 200, ctx.correlationId);
      }

      const presenceData = doc.data() as any;
      const lastSeen = presenceData?.lastSeen || 0;
      const status = presenceData?.status || "offline";
      const now = Date.now();

      // User is online if status is "online" AND last seen within 30 seconds
      const isOnline = status === "online" && now - lastSeen < 30 * 1000;

      return successResponse({ isOnline, lastSeen }, 200, ctx.correlationId);
    } catch (e) {
      console.error("presence GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("presence query failed", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "presence_get", maxRequests: 200 }
  }
);
