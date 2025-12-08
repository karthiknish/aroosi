/**
 * Firebase Crashlytics Service
 * Crash reporting and error logging
 */

import crashlytics from '@react-native-firebase/crashlytics';

// Initialize crashlytics (called in App.tsx)
export const initCrashlytics = async () => {
    // Enable crashlytics collection
    await crashlytics().setCrashlyticsCollectionEnabled(true);
};

// Log a custom error
export const logError = (error: Error, context?: string) => {
    if (context) {
        crashlytics().log(context);
    }
    crashlytics().recordError(error);
};

// Log a message
export const logMessage = (message: string) => {
    crashlytics().log(message);
};

// Set user identifier for crash reports
export const setUserId = (userId: string) => {
    crashlytics().setUserId(userId);
};

// Set custom attributes
export const setUserAttributes = (attributes: Record<string, string>) => {
    Object.entries(attributes).forEach(([key, value]) => {
        crashlytics().setAttribute(key, value);
    });
};

// Force a crash for testing (use only in development)
export const testCrash = () => {
    crashlytics().crash();
};

export default crashlytics;
