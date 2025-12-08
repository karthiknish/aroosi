/**
 * Aroosi Theme - Colors
 * Matching the web app's design system
 */

export const colors = {
    // Primary brand colors (matching web app)
    primary: {
        50: '#FEF2F2',
        100: '#FEE2E2',
        200: '#FECACA',
        300: '#FCA5A5',
        400: '#F87171',
        500: '#EF4444',
        600: '#DC2626',
        700: '#B91C1C',
        800: '#991B1B',
        900: '#7F1D1D',
        DEFAULT: '#B91C1C', // Primary brand color
    },

    // Neutral colors
    neutral: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
    },

    // Background colors
    background: {
        light: '#FFFFFF',
        dark: '#121212',
        card: {
            light: '#FFFFFF',
            dark: '#1E1E1E',
        },
    },

    // Text colors
    text: {
        primary: {
            light: '#171717',
            dark: '#FAFAFA',
        },
        secondary: {
            light: '#525252',
            dark: '#A3A3A3',
        },
        muted: {
            light: '#737373',
            dark: '#737373',
        },
    },

    // Semantic colors
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // UI colors
    border: {
        light: '#E5E5E5',
        dark: '#404040',
    },

    // Transparent overlays
    overlay: {
        light: 'rgba(0, 0, 0, 0.5)',
        dark: 'rgba(0, 0, 0, 0.7)',
    },
};

export type ColorScheme = 'light' | 'dark';

export const getColors = (scheme: ColorScheme) => ({
    primary: colors.primary.DEFAULT,
    primaryLight: colors.primary[100],
    background: scheme === 'light' ? colors.background.light : colors.background.dark,
    card: scheme === 'light' ? colors.background.card.light : colors.background.card.dark,
    text: scheme === 'light' ? colors.text.primary.light : colors.text.primary.dark,
    textSecondary: scheme === 'light' ? colors.text.secondary.light : colors.text.secondary.dark,
    textMuted: scheme === 'light' ? colors.text.muted.light : colors.text.muted.dark,
    border: scheme === 'light' ? colors.border.light : colors.border.dark,
    overlay: scheme === 'light' ? colors.overlay.light : colors.overlay.dark,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
});
