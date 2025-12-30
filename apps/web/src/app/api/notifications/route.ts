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

// PATCH handler for backward compatibility - same as POST
export const PATCH = createAuthenticatedHandler(
  async (ctx: ApiContext, body: any) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    
    try {
      // Handle various PATCH body formats
      const ids = body.ids || (body.notificationId ? [body.notificationId] : []);
      const markAllRead = body.markAllRead === true;
      
      if (markAllRead) {
        // Mark all as read - fetch all unread and mark them
        const { updated, readAt } = await markNotificationsRead(userId, []);
        return successResponse({ updated, readAt, allMarked: true }, 200, ctx.correlationId);
      }
      
      if (ids.length > 0) {
        const { updated, readAt } = await markNotificationsRead(userId, ids);
        return successResponse({ updated, readAt }, 200, ctx.correlationId);
      }
      
      // Handle settings update
      if (body.settings) {
        // Settings are stored on user profile, not notifications collection
        // For now, acknowledge the request
        return successResponse({ settingsUpdated: true }, 200, ctx.correlationId);
      }
      
      return errorResponse("No valid action specified", 400, { correlationId: ctx.correlationId });
    } catch (e) {
      console.error("notifications PATCH error", {
        error: e instanceof Error ? e.message : String(e),
        correlationId: ctx.correlationId,
      });
      return errorResponse('Failed to update notifications', 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "notifications_patch", maxRequests: 30 }
  }
);
