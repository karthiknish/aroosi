import { NextRequest } from 'next/server';
import { processEmailBatch } from '@/lib/emailQueue';
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";

// Simple protected endpoint to manually trigger processing batch (could be cron / scheduled)
export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext) => {
  const { user, correlationId, request } = ctx;
  
  // Basic role gate
  if (user.role !== 'admin' && user.role !== 'moderator') {
    return errorResponse('Forbidden: Admin or Moderator access required', 403, { correlationId });
  }

  try {
    // Optional secret header check for extra protection (besides auth)
    const secret = process.env.EMAIL_QUEUE_PROCESS_SECRET;
    if (secret) {
      const provided = request.headers.get('x-email-queue-secret');
      if (provided !== secret) {
        return errorResponse('Invalid secret', 401, { correlationId });
      }
    }
    
    const results = await processEmailBatch(15);
    return successResponse({ results }, 200, correlationId);
  } catch (e) {
    console.error("[admin.email-queue] fatal error", {
      correlationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return errorResponse('Processing failed', 500, { correlationId });
  }
}, {
  rateLimit: { identifier: "admin_email_process", maxRequests: 10 }
});

