/**
 * Aroosi Theme - Colors
 * Matching the web app's design system
 */

export const colors = {
    // Primary brand colors (matching web app's new palette)
    primary: {
        50: '#FDF2F8',
        100: '#FCE7F3',
        200: '#FBCFE8',
        300: '#F9A8D4',
        400: '#F472B6',
        500: '#EC4899',
        600: '#DB2777',
        700: '#BE185D',
        800: '#9D174D',
        900: '#831843',
        DEFAULT: '#EC4899', // Primary brand color (Softer Pink)
    },

    // Secondary colors (Deeper dusty blue)
    secondary: {
        50: '#F0F7FA',
        100: '#E1EFF5',
        200: '#C2DFEB',
        300: '#A2C4DB',
        400: '#82A9CB',
        500: '#5F92AC',
        600: '#4D7A91',
        700: '#3E647A',
        800: '#2F4D5E',
        900: '#1F3642',
        DEFAULT: '#5F92AC',
    },

    // Accent colors (Muted Gold / Warm Sand)
    accent: {
        50: '#FBF8F3',
        100: '#F7F1E7',
        200: '#EDD6A4',
        300: '#D6B27C',
        400: '#B28E5F',
        DEFAULT: '#D6B27C',
    },

    // Neutral colors
    neutral: {
        50: '#F9F7F5', // Base light
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#7A7A7A', // Neutral light
        600: '#525252',
        700: '#4A4A4A', // Neutral
        800: '#2D2D2D', // Neutral dark
        900: '#171717',
    },

    // Background colors
    background: {
        light: '#F9F7F5',
        dark: '#121212',
        card: {
            light: '#FFFFFF',
            dark: '#1E1E1E',
        },
    },

    // Text colors
    text: {
        primary: {
            light: '#2D2D2D',
            dark: '#FAFAFA',
        },
        secondary: {
            light: '#4A4A4A',
            dark: '#A3A3A3',
        },
        muted: {
            light: '#7A7A7A',
            dark: '#7A7A7A',
        },
    },

    // Semantic colors
    success: '#7BA17D',
    warning: '#F59E0B',
    error: '#B45E5E',
    info: '#0EA5E9',

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
