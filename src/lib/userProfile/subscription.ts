import { db, COLLECTIONS } from '@/lib/userProfile';
import type { UserProfile } from '@/lib/userProfile';

// Utilities for subscription-related profile mutations
export async function applySubscription(
  email: string,
  plan: 'premium' | 'premiumPlus',
  params: { expiresAt?: number | null; stripeCustomerId?: string; stripeSubscriptionId?: string }
): Promise<boolean> {
  const snap = await db.collection(COLLECTIONS.USERS).where('email', '==', email.toLowerCase()).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.set({
    subscriptionPlan: plan,
    subscriptionExpiresAt: params.expiresAt ?? null,
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    updatedAt: Date.now()
  }, { merge: true });
  return true;
}

export async function downgradeToFree(email: string): Promise<boolean> {
  const snap = await db.collection(COLLECTIONS.USERS).where('email', '==', email.toLowerCase()).limit(1).get();
  if (snap.empty) return false;
  await snap.docs[0].ref.set({
    subscriptionPlan: 'free',
    subscriptionExpiresAt: null,
    updatedAt: Date.now()
  }, { merge: true });
  return true;
}

export function deriveFeatureFlags(plan: UserProfile['subscriptionPlan']): UserProfile['subscriptionFeatures'] {
  switch (plan) {
    case 'premium_plus':
      return { unlimitedLikes: true, seeWhoLiked: true, advancedSearch: true, prioritySupport: true };
    case 'premium':
      return { unlimitedLikes: true, seeWhoLiked: true, advancedSearch: true };
    default:
      return {};
  }
}
