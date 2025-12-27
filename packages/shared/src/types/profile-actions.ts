/**
 * Profile action result types (boost, spotlight, etc.)
 * Shared between web and mobile.
 */

export interface ProfileBoostResponse {
    success: boolean;
    code?: string;
    message?: string;
    boostedUntil?: number;
    boostsRemaining?: number;
    unlimited?: boolean;
    correlationId?: string;
}

export interface ProfileSpotlightResponse {
    success: boolean;
    code?: string;
    message?: string;
    hasSpotlightBadge?: boolean;
    spotlightBadgeExpiresAt?: number;
    unlimited?: boolean;
    correlationId?: string;
}
