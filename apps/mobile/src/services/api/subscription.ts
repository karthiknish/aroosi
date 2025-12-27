/**
 * Subscription API Service
 */

import { api } from './client';
import type { 
    Subscription, 
    SubscriptionPlan, 
    SubscriptionTier, 
    SubscriptionStatus,
    SubscriptionStatusInfo 
} from '@aroosi/shared';

// Re-export types for convenience
export type { 
    Subscription, 
    SubscriptionPlan, 
    SubscriptionTier, 
    SubscriptionStatus,
    SubscriptionStatusInfo 
} from '@aroosi/shared';

/**
 * Get current subscription
 */
export async function getSubscription() {
    return api.get<Subscription>('/subscription');
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus() {
    const res = await api.get<Subscription>('/subscription');
    if (res.data) {
        return {
            ...res,
            data: {
                plan: res.data.tier,
                isPremium: res.data.tier !== 'free',
                features: res.data.features,
                expiresAt: res.data.endDate,
            } as SubscriptionStatusInfo,
        };
    }
    return {
        ...res,
        data: {
            plan: 'free' as SubscriptionTier,
            isPremium: false,
            features: [],
        } as SubscriptionStatusInfo,
    };
}

/**
 * Get available plans
 */
export async function getPlans() {
    return api.get<SubscriptionPlan[]>('/subscription/plans');
}

/**
 * Check if user has premium features
 */
export async function checkPremiumAccess() {
    return api.get<{
        isPremium: boolean;
        tier: SubscriptionTier;
        features: string[];
    }>('/subscription/check');
}

/**
 * Create checkout session (for purchasing)
 */
export async function createCheckoutSession(planId: string, isYearly: boolean) {
    return api.post<{ sessionId: string; url?: string }>('/subscription/checkout', {
        planId,
        interval: isYearly ? 'yearly' : 'monthly',
        platform: 'ios', // or 'android'
    });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription() {
    return api.post<{ success: boolean }>('/subscription/cancel');
}

/**
 * Restore purchases (for App Store / Play Store)
 */
export async function restorePurchases(receipt: string, platform: 'ios' | 'android') {
    return api.post<{
        restored: boolean;
        subscription?: Subscription;
    }>('/subscription/restore', {
        receipt,
        platform,
    });
}

/**
 * Verify App Store receipt
 */
export async function verifyReceipt(receipt: string) {
    return api.post<{
        valid: boolean;
        subscription?: Subscription;
    }>('/subscription/verify-receipt', {
        receipt,
        platform: 'ios',
    });
}
