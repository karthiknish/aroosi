import { 
  createAuthenticatedHandler, 
  successResponse, 
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { listUserNotifications, markNotificationsRead } from "@/lib/notifications/firebaseNotifications";
import { notificationsMarkReadSchema } from "@/lib/validation/apiSchemas/notifications";

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
  async (ctx: ApiContext, body: import("zod").infer<typeof notificationsMarkReadSchema>) => {
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
    bodySchema: notificationsMarkReadSchema,
    rateLimit: { identifier: "notifications_mark_read", maxRequests: 30 }
  }
);
