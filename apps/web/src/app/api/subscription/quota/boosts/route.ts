import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/requireAuth';
import { db } from '@/lib/firebaseAdmin';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { getPlanLimits, featureRemaining, normalisePlan } from '@/lib/subscription/planLimits';
import { COL_USAGE_MONTHLY, usageMonthlyId, monthKey } from '@/lib/firestoreSchema';

// Quota endpoint for profile boosts (profile_boost_used)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.userId;
    const profileSnap = await db.collection('users').doc(userId).get();
    if (!profileSnap.exists) return errorResponse('Profile not found', 404);
    const profile = profileSnap.data() as any;
    const plan = normalisePlan(profile.subscriptionPlan || 'free');

    const limits = getPlanLimits(plan);
    const limit = limits.profile_boost_used ?? 0;

    // Unlimited plan shortcut
    if (limit === -1) {
      return successResponse({
        feature: 'profile_boost_used',
        plan,
        limit: -1,
        remaining: -1,
        unlimited: true,
      });
    }

    const month = monthKey();
    const monthlyId = usageMonthlyId(userId, 'profile_boost_used', month);
    const monthlySnap = await db.collection(COL_USAGE_MONTHLY).doc(monthlyId).get();
    const used = monthlySnap.exists ? ((monthlySnap.data() as any).count || 0) : 0;
    const rem = featureRemaining(plan, 'profile_boost_used' as any, used);
    return successResponse({
      feature: 'profile_boost_used',
      plan,
      limit: rem.limit,
      used,
      remaining: rem.remaining,
      unlimited: rem.unlimited,
    });
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e.message, e.status);
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse('Failed to fetch boosts quota', 500, { details: msg });
  }
}
