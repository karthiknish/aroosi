import { NextRequest } from 'next/server';
import { withFirebaseAuth } from '@/lib/auth/firebaseAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { listUserNotifications, markNotificationsRead } from '@/lib/notifications/firebaseNotifications';

export const GET = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2,10);
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit')||'25',10)||25,1),100);
    const beforeParam = url.searchParams.get('before');
    const before = beforeParam ? parseInt(beforeParam,10) : undefined;
    const notifications = await listUserNotifications(user.id, limit, before);
    return successResponse({ notifications, correlationId });
  } catch (e) {
    return errorResponse('Failed to fetch notifications', 500, { correlationId });
  }
});

export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2,10);
  try {
    const body = await req.json().catch(()=>({}));
    const { ids } = body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length===0) return errorResponse('ids required',400,{ correlationId });
    const { updated, readAt } = await markNotificationsRead(user.id, ids);
    return successResponse({ updated, readAt, correlationId });
  } catch (e) {
    return errorResponse('Failed to update notifications', 500, { correlationId });
  }
});
