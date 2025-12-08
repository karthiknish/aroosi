/**
 * EmptyState Component
 * Display when there's no content
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

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
        padding: spacing[6],
    },
    emoji: {
        fontSize: 80,
        marginBottom: spacing[4],
    },
    title: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[800],
        textAlign: 'center',
        marginBottom: spacing[2],
    },
    message: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
        textAlign: 'center',
        lineHeight: fontSize.base * 1.6,
        marginBottom: spacing[6],
    },
    button: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[3],
        borderRadius: borderRadius.xl,
    },
    buttonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
