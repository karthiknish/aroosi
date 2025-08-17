import { NextRequest } from 'next/server';
import { withFirebaseAuth } from '@/lib/auth/firebaseAuth';
import { processEmailBatch } from '@/lib/emailQueue';

// Simple protected endpoint to manually trigger processing batch (could be cron / scheduled)
export async function POST(request: NextRequest) {
  return withFirebaseAuth(async (user) => {
    // Basic role gate
  const role: any = (user as any)?.role;
  if (role !== 'admin' && role !== 'moderator') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
    }
    try {
      // Optional secret header check for extra protection (besides auth)
      const secret = process.env.EMAIL_QUEUE_PROCESS_SECRET;
      if (secret) {
        const provided = request.headers.get('x-email-queue-secret');
        if (provided !== secret) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid secret' }), { status: 401 });
        }
      }
      const results = await processEmailBatch(15);
      return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Processing failed' }), { status: 500 });
    }
  })(request);
}
