/**
 * Subscription Types - Shared between web and mobile
 */

export type SubscriptionTier = 'free' | 'plus' | 'gold' | 'platinum';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface Subscription {
    id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    features: string[];
    startDate: Date | string;
    endDate?: Date | string;
    autoRenew: boolean;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    tier: SubscriptionTier;
    price: {
        monthly: number;
        yearly: number;
        currency: string;
    };
    features: string[];
    popular?: boolean;
}

/** Extended status info for UI display */
export interface SubscriptionStatusInfo {
    plan: SubscriptionTier;
    isPremium: boolean;
    features: string[];
    expiresAt?: string;
}

/** Checkout request */
export interface CheckoutRequest {
    planId: string;
    interval: 'monthly' | 'yearly';
    platform: 'ios' | 'android' | 'web';
}
