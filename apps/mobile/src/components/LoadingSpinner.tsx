/**
 * LoadingSpinner Component
 * Simple loading indicator
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { 
    colors, 
    spacing, 
    fontSize,
    moderateScale,
    responsiveFontSizes,
} from '../theme';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'small' | 'large';
}

export function LoadingSpinner({ message, size = 'large' }: LoadingSpinnerProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={colors.primary.DEFAULT} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: moderateScale(16),
    },
    message: {
        marginTop: moderateScale(12),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        textAlign: 'center',
    },
});
