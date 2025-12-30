import { NextRequest } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/requireAuth';
import { db } from '@/lib/firebaseAdmin';
import { successResponse, errorResponse } from '@/lib/api/handler';
import { COL_USAGE_EVENTS, COL_USAGE_MONTHLY, buildUsageEvent, buildUsageMonthly, monthKey, usageMonthlyId } from '@/lib/firestoreSchema';
import { SUBSCRIPTION_FEATURES, getPlanLimits } from '@/lib/subscription/planLimits';

const FEATURES = SUBSCRIPTION_FEATURES;

async function getProfile(userId: string) { const p = await db.collection('users').doc(userId).get(); return p.exists ? p.data() as any : null; }

async function getMonthlyUsageMap(userId: string, currentMonth: string) {
  const snap = await db.collection(COL_USAGE_MONTHLY).where('userId','==', userId).where('month','==', currentMonth).get();
  const map: Record<string, number> = {}; snap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => { const data = d.data() as any; map[data.feature] = data.count; }); return map;
}

async function getDailyUsage(userId: string) {
  const since = Date.now() - 24*60*60*1000; // 24h
  const snap = await db.collection(COL_USAGE_EVENTS).where('userId','==', userId).where('timestamp','>=', since).get();
  const daily: Record<string, number> = {}; snap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => { const data = d.data() as any; if (data.feature === 'profile_view' || data.feature === 'search_performed') daily[data.feature] = (daily[data.feature]||0)+1; }); return daily;
}

export async function GET(req: NextRequest) { // usage stats
  let auth; try { auth = await requireAuth(req);} catch(e){ const err = e as AuthError; return errorResponse(err.message, err.status); }
  try {
    const profile = await getProfile(auth.userId); if (!profile) return errorResponse('Profile not found',404);
  const plan = profile.subscriptionPlan || 'free'; const limits = getPlanLimits(plan);
    const month = monthKey();
    const monthlyMap = await getMonthlyUsageMap(auth.userId, month);
    const dailyMap = await getDailyUsage(auth.userId);
    const features = FEATURES.map(f => { const isDaily = f==='profile_view'||f==='search_performed'; const used = isDaily ? (dailyMap[f]||0) : (monthlyMap[f]||0); const limit = limits[f]; return { feature: f, used, limit, unlimited: limit===-1, remaining: limit===-1? -1 : Math.max(0, limit-used), percentageUsed: limit===-1?0: Math.min(100, Math.round((used/limit)*100)), isDailyLimit: isDaily }; });
    return successResponse({ plan, usage: features, monthlyUsage: monthlyMap, dailyUsage: dailyMap, limits });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse('Failed to fetch usage statistics', 500, { details: { message: msg } });
  }
}

export async function POST(req: NextRequest) { // track usage
  let auth; try { auth = await requireAuth(req);} catch(e){ const err = e as AuthError; return errorResponse(err.message, err.status); }
  let body: any = {}; try { body = await req.json(); } catch {}
  const { feature, metadata } = body;
  if (!feature || !FEATURES.includes(feature)) return errorResponse(`Invalid feature. Must be one of: ${FEATURES.join(', ')}`,400);
  try {
    const profile = await getProfile(auth.userId); if (!profile) return errorResponse('Profile not found',404);
  const plan = profile.subscriptionPlan || 'free'; const limits = getPlanLimits(plan); const limit = limits[feature as keyof typeof limits];
    // Check limit
    let currentUsage = 0; const month = monthKey();
    if (feature === 'profile_view' || feature === 'search_performed') { const dailyMap = await getDailyUsage(auth.userId); currentUsage = dailyMap[feature] || 0; }
    else { const monthlyMap = await getMonthlyUsageMap(auth.userId, month); currentUsage = monthlyMap[feature] || 0; }
    if (limit !== -1 && currentUsage >= limit)
      return errorResponse('Feature usage limit reached', 403, {
        details: { limit, used: currentUsage, remaining: 0 },
      });
    // Record event
    const event = buildUsageEvent(auth.userId, feature, metadata);
    const batch = db.batch();
    const eventRef = db.collection(COL_USAGE_EVENTS).doc(); batch.set(eventRef, event);
    // Monthly aggregate doc id deterministic
    const monthlyId = usageMonthlyId(auth.userId, feature, event.month);
    const monthlyRef = db.collection(COL_USAGE_MONTHLY).doc(monthlyId);
    const monthlySnap = await monthlyRef.get();
    if (monthlySnap.exists) { const data = monthlySnap.data() as any; batch.update(monthlyRef, { count: (data.count||0)+1, updatedAt: Date.now() }); }
    else { batch.set(monthlyRef, buildUsageMonthly(auth.userId, feature, event.month, 1)); }
    await batch.commit();
    const newUsage = currentUsage + 1;
    return successResponse({ feature, tracked: true, currentUsage: newUsage, limit, remainingQuota: limit===-1? -1 : Math.max(0, limit-newUsage), isUnlimited: limit===-1, plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse('Failed to track feature usage', 500, { details: { message: msg } });
  }
}
