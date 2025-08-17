import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/requireAuth';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { db } from '@/lib/firebaseAdmin';
import { COL_USAGE_EVENTS, COL_USAGE_MONTHLY, monthKey, usageMonthlyId } from '@/lib/firestoreSchema';
import { getPlanLimits } from '@/lib/subscription/planLimits';

// Returns remaining quota for voice_message_sent feature (24h window for premium, unlimited for premiumPlus)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const userId = auth.userId;
    const profileDoc = await db.collection('users').doc(userId).get();
    if (!profileDoc.exists) return errorResponse('Profile not found',404);
    const profile = profileDoc.data() as any;
    const plan = profile.subscriptionPlan || 'free';
    const limits = getPlanLimits(plan);
    const limit = limits.voice_message_sent ?? 0;
    // Unlimited
    if (limit === -1) {
      return successResponse({ plan, unlimited: true, remaining: -1, used: 0, limit });
    }
    // Count last 24h events for voice_message_sent
    const since = Date.now() - 24*60*60*1000;
    const snap = await db.collection(COL_USAGE_EVENTS)
      .where('userId','==', userId)
      .where('timestamp','>=', since)
      .where('feature','==','voice_message_sent')
      .get();
    const used = snap.size;
    const remaining = Math.max(0, limit - used);
    return successResponse({ plan, unlimited: false, limit, used, remaining, window: 'rolling_24h' });
  } catch (e) {
    const err = e as AuthError | Error; const message = (err as any).message || 'Failed'; const status = (err as any).status || 500;
    return errorResponse('Failed to fetch voice quota', status, { details: message });
  }
}
