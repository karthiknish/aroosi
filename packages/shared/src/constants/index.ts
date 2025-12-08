/**
 * Shared Constants
 */

// App Info
export const APP_NAME = 'Aroosi';
export const APP_VERSION = '1.0.0';

// API
export const API_TIMEOUT = 30000; // 30 seconds

// Limits
export const MAX_PHOTOS = 6;
export const MAX_BIO_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 1000;

// Age
export const MIN_AGE = 18;
export const MAX_AGE = 100;
export const DEFAULT_AGE_RANGE = { min: 21, max: 45 };

// Distance
export const MAX_DISTANCE_KM = 500;
export const DEFAULT_MAX_DISTANCE = 50; // km

// Matching
export const DAILY_LIKE_LIMIT = 100;
export const DAILY_SUPERLIKE_LIMIT = 5;

// Premium Features
export const PREMIUM_FEATURES = [
    'unlimited_likes',
    'see_who_likes_you',
    'super_likes',
    'boost',
    'undo',
    'no_ads',
] as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[number];
