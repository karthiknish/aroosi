/**
 * Aroosi Theme - Typography
 */

import { Platform } from 'react-native';

export const fontFamily = {
    regular: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
    }),
    medium: Platform.select({
        ios: 'System',
        android: 'Roboto-Medium',
        default: 'System',
    }),
    bold: Platform.select({
        ios: 'System',
        android: 'Roboto-Bold',
        default: 'System',
    }),
};

export const fontSize = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
};

export const lineHeight = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
};

export const fontWeight = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const typography = {
    h1: {
        fontSize: fontSize['4xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSize['4xl'] * lineHeight.tight,
    },
    h2: {
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.bold,
        lineHeight: fontSize['3xl'] * lineHeight.tight,
    },
    h3: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.semibold,
        lineHeight: fontSize['2xl'] * lineHeight.tight,
    },
    h4: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.semibold,
        lineHeight: fontSize.xl * lineHeight.tight,
    },
    body: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.normal,
        lineHeight: fontSize.base * lineHeight.normal,
    },
    bodySmall: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.normal,
        lineHeight: fontSize.sm * lineHeight.normal,
    },
    caption: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.normal,
        lineHeight: fontSize.xs * lineHeight.normal,
    },
    button: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        lineHeight: fontSize.base * lineHeight.tight,
    },
};
