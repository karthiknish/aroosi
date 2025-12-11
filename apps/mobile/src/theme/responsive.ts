/**
 * Aroosi Theme - Responsive Utilities
 * Provides scaling functions and breakpoints for responsive design
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro as reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Device size breakpoints
export const breakpoints = {
    small: 375,   // iPhone SE, older iPhones
    medium: 390,  // iPhone 14, 15
    large: 428,   // iPhone Pro Max
    tablet: 768,  // iPad
};

/**
 * Get current device size category
 */
export function getDeviceSize(): 'small' | 'medium' | 'large' | 'tablet' {
    if (SCREEN_WIDTH >= breakpoints.tablet) return 'tablet';
    if (SCREEN_WIDTH >= breakpoints.large) return 'large';
    if (SCREEN_WIDTH >= breakpoints.medium) return 'medium';
    return 'small';
}

/**
 * Check if device is small (iPhone SE size)
 */
export const isSmallDevice = SCREEN_WIDTH < breakpoints.medium;

/**
 * Check if device is large (Pro Max size)
 */
export const isLargeDevice = SCREEN_WIDTH >= breakpoints.large;

/**
 * Check if device is a tablet
 */
export const isTablet = SCREEN_WIDTH >= breakpoints.tablet;

/**
 * Scale a value based on screen width (horizontal scaling)
 * Useful for padding, margins, font sizes
 */
export function wp(widthPercent: number): number {
    return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * widthPercent) / 100);
}

/**
 * Scale a value based on screen height (vertical scaling)
 * Useful for vertical spacing, image heights
 */
export function hp(heightPercent: number): number {
    return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
}

/**
 * Scale a pixel value based on screen width ratio
 * Uses iPhone 14 Pro (393pt) as base
 */
export function scaleWidth(size: number): number {
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size * scale;
    return PixelRatio.roundToNearestPixel(newSize);
}

/**
 * Scale a pixel value based on screen height ratio
 */
export function scaleHeight(size: number): number {
    const scale = SCREEN_HEIGHT / BASE_HEIGHT;
    const newSize = size * scale;
    return PixelRatio.roundToNearestPixel(newSize);
}

/**
 * Moderate scale - scales but with moderation factor
 * Good for font sizes where you don't want extreme scaling
 * factor: 0.5 = moderate, 1 = full scale, 0 = no scale
 */
export function moderateScale(size: number, factor: number = 0.5): number {
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    return PixelRatio.roundToNearestPixel(size + (size * (scale - 1) * factor));
}

/**
 * Get responsive value based on device size
 */
export function responsive<T>(values: {
    small?: T;
    medium?: T;
    large?: T;
    tablet?: T;
    default: T;
}): T {
    const deviceSize = getDeviceSize();
    return values[deviceSize] ?? values.default;
}

/**
 * Responsive font size - scales moderately
 */
export function responsiveFont(size: number): number {
    return moderateScale(size, 0.3);
}

/**
 * Responsive spacing - scales with screen width
 */
export function responsiveSpacing(size: number): number {
    return moderateScale(size, 0.5);
}

/**
 * Get responsive image dimensions
 */
export function responsiveImage(baseWidth: number, aspectRatio: number = 1) {
    const width = scaleWidth(baseWidth);
    const height = width / aspectRatio;
    return { width, height };
}

/**
 * Common responsive values
 */
export const responsiveValues = {
    // Padding/margins
    screenPadding: responsive({ small: 12, medium: 16, large: 20, default: 16 }),
    cardPadding: responsive({ small: 12, medium: 16, large: 20, default: 16 }),
    itemSpacing: responsive({ small: 8, medium: 12, large: 16, default: 12 }),
    
    // Avatar sizes
    avatarSmall: responsive({ small: 40, medium: 48, large: 56, default: 48 }),
    avatarMedium: responsive({ small: 56, medium: 64, large: 72, default: 64 }),
    avatarLarge: responsive({ small: 80, medium: 100, large: 120, default: 100 }),
    
    // Button heights
    buttonSmall: responsive({ small: 32, medium: 36, large: 40, default: 36 }),
    buttonMedium: responsive({ small: 40, medium: 44, large: 48, default: 44 }),
    buttonLarge: responsive({ small: 48, medium: 52, large: 56, default: 52 }),
    
    // Header height
    headerHeight: responsive({ small: 48, medium: 56, large: 64, default: 56 }),
    
    // Tab bar
    tabBarHeight: responsive({ small: 70, medium: 80, large: 90, default: 80 }),
    
    // Card image heights
    cardImageSmall: responsive({ small: 120, medium: 140, large: 160, default: 140 }),
    cardImageLarge: responsive({ small: 200, medium: 240, large: 280, default: 240 }),
};

/**
 * Responsive font sizes
 */
export const responsiveFontSizes = {
    xs: responsiveFont(12),
    sm: responsiveFont(14),
    base: responsiveFont(16),
    lg: responsiveFont(18),
    xl: responsiveFont(20),
    '2xl': responsiveFont(24),
    '3xl': responsiveFont(30),
    '4xl': responsiveFont(36),
};

/**
 * Screen dimensions export
 */
export { SCREEN_WIDTH, SCREEN_HEIGHT };

/**
 * Safe area utilities (combine with useSafeAreaInsets)
 */
export const platformPadding = {
    top: Platform.select({ ios: 0, android: 0 }),
    bottom: Platform.select({ ios: 34, android: 0 }),
};
