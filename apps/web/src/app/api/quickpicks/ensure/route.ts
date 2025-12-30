import { NextRequest } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  AuthenticatedApiContext,
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";

function utcDayKey(ts: number = nowTimestamp()): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0')
  );
}

export const POST = createAuthenticatedHandler(async (ctx: AuthenticatedApiContext, body: any) => {
  const { user, correlationId } = ctx;
  
  try {
    const dayKey = (body?.dayKey && String(body.dayKey).length === 8) ? body.dayKey : utcDayKey();

    // Check existing
    const existingSnap = await db.collection('userDailyQuickPicks')
      .where('userId', '==', user.id)
      .where('dayKey', '==', dayKey)
      .limit(1)
      .get();
      
    if (!existingSnap.empty) {
      return successResponse({ 
        picks: existingSnap.docs[0].data().picks, 
        dayKey, 
        cached: true 
      }, 200, correlationId);
    }

    // Fetch candidate profiles (newest first) excluding self
    const profileSnap = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
      
    const candidates: string[] = [];
    profileSnap.docs.forEach((d: any) => {
      const data = d.data() as any;
      if (d.id === user.id) return;
      if (data.banned) return;
      candidates.push(d.id);
    });

    // Determine subscription plan limit
    const plan = (profileSnap.docs.find((d: any) => d.id === user.id)?.data() as any)?.subscriptionPlan || 'free';
    const limit = plan === 'premiumPlus' ? 40 : plan === 'premium' ? 20 : 5;

    const picks: string[] = [];
    // Simple random sampling without replacement
    for (let i = 0; i < candidates.length && picks.length < limit; i++) {
      const j = Math.floor(Math.random() * candidates.length);
      const uid = candidates[j];
      if (!picks.includes(uid)) picks.push(uid);
    }

    await db.collection('userDailyQuickPicks').add({
      userId: user.id,
      dayKey,
      picks,
      createdAt: nowTimestamp(),
    });

    return successResponse({ picks, dayKey }, 200, correlationId);
  } catch (err: any) {
    console.error("[quickpicks.ensure] fatal error", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err?.message || 'Failed to ensure quickpicks', 400, { correlationId });
  }
}, {
  rateLimit: { identifier: "quickpicks_ensure", maxRequests: 5 }
});

