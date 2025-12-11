/**
 * EmptyState Component
 * Display when there's no content
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../theme';

interface EmptyStateProps {
    emoji?: string;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    emoji = '📭',
    title,
    message,
    actionLabel,
    onAction
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={styles.button}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: responsiveValues.screenPadding,
    },
    emoji: {
        fontSize: moderateScale(80),
        marginBottom: moderateScale(16),
    },
    title: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[800],
        textAlign: 'center',
        marginBottom: moderateScale(8),
    },
    message: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        textAlign: 'center',
        lineHeight: responsiveFontSizes.base * 1.6,
        marginBottom: moderateScale(24),
    },
    button: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(24),
        paddingVertical: moderateScale(12),
        borderRadius: borderRadius.xl,
        minHeight: responsiveValues.buttonMedium,
    },
    buttonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
