/**
 * App Configuration
 */

// API Base URL - from environment or default
export const API_BASE_URL = process.env.API_BASE_URL || 'https://www.aroosi.app/api';

// Environment
export const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
export const DEBUG = ENVIRONMENT === 'development';

// Feature flags
export const FEATURES = {
    PUSH_NOTIFICATIONS: true,
    VOICE_MESSAGES: true,
    VIDEO_CALLS: false, // Coming soon
    PREMIUM_FEATURES: true,
};

// Limits
export const LIMITS = {
    MAX_PHOTOS: 6,
    MAX_BIO_LENGTH: 500,
    MAX_MESSAGE_LENGTH: 1000,
    DAILY_LIKES: 100,
    DAILY_SUPER_LIKES: 5,
};

// Timeouts (in milliseconds)
export const TIMEOUTS = {
    API_REQUEST: 30000,
    DEBOUNCE_SEARCH: 300,
    TYPING_INDICATOR: 3000,
};
