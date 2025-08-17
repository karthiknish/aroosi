import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAuth } from '@/lib/auth/firebaseAuth';
import { db } from '@/lib/firebaseAdmin';

function utcDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0')
  );
}

export const POST = withFirebaseAuth(async (user, req: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2,10);
  try {
    const body = await req.json().catch(() => ({}));
    const dayKey = (body?.dayKey && String(body.dayKey).length === 8) ? body.dayKey : utcDayKey();

    // Check existing
    const existingSnap = await db.collection('userDailyQuickPicks')
      .where('userId', '==', user.id)
      .where('dayKey', '==', dayKey)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      return NextResponse.json({ success: true, picks: existingSnap.docs[0].data().picks, dayKey, correlationId, cached: true });
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
      if (!data.isProfileComplete) return;
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
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, picks, dayKey, correlationId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed', correlationId }, { status: 400 });
  }
});
