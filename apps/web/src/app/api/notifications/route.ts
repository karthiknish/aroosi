import { z } from "zod";
import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { listUserNotifications, markNotificationsRead } from "@/lib/notifications/firebaseNotifications";

// Zod schema for POST body validation
const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one notification ID is required"),
});

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const url = new URL(ctx.request.url);
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '25', 10) || 25, 1), 100);
      const beforeParam = url.searchParams.get('before');
      const before = beforeParam ? parseInt(beforeParam, 10) : undefined;
      
      const notifications = await listUserNotifications(userId, limit, before);
      return successResponse({ notifications }, 200, ctx.correlationId);
    } catch (e) {
      console.error("notifications GET error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse('Failed to fetch notifications', 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "notifications_get", maxRequests: 50 }
  }
);

export const POST = createAuthenticatedHandler(
  async (ctx: ApiContext, body: z.infer<typeof markReadSchema>) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      const { updated, readAt } = await markNotificationsRead(userId, body.ids);
      return successResponse({ updated, readAt }, 200, ctx.correlationId);
    } catch (e) {
      console.error("notifications POST error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse('Failed to update notifications', 500, { correlationId: ctx.correlationId });
    }
  },
  {
    bodySchema: markReadSchema,
    rateLimit: { identifier: "notifications_mark_read", maxRequests: 30 }
  }
);
