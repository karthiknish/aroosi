/**
 * AdaptiveGlass Component
 * Provides liquid glass effect on iOS 26+ with BlurView fallback
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

interface AdaptiveGlassProps {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    tint?: 'default' | 'light' | 'dark' | 'systemMaterial' | 'systemThinMaterial' | 'systemUltraThinMaterial' | 'systemThickMaterial' | 'systemChromeMaterial';
    isInteractive?: boolean;
}

/**
 * Adaptive glass component that uses GlassView on iOS 26+ and BlurView as fallback
 * Automatically provides the best available visual effect for the platform
 */
export function AdaptiveGlass({
    children,
    style,
    intensity = 80,
    tint = 'systemMaterial',
    isInteractive = false,
}: AdaptiveGlassProps) {
    // Use GlassView if liquid glass is available (iOS 26+)
    if (isLiquidGlassAvailable()) {
        return (
            <GlassView
                isInteractive={isInteractive}
                style={[styles.glass, style]}
            >
                {children}
            </GlassView>
        );
    }

    // Fallback to BlurView for older iOS versions and other platforms
    return (
        <BlurView
            tint={tint}
            intensity={intensity}
            style={[styles.glass, style]}
        >
            {children}
        </BlurView>
    );
}

/**
 * Glass button component with interactive effect
 */
export function GlassButton({
    children,
    onPress,
    size = 44,
}: {
    children: ReactNode;
    onPress: () => void;
    size?: number;
}) {
    const buttonStyle: ViewStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    };

    return (
        <AdaptiveGlass
            isInteractive={true}
            style={buttonStyle}
        >
            <View
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                onStartShouldSetResponder={() => true}
                onResponderRelease={onPress}
            >
                {children}
            </View>
        </AdaptiveGlass>
    );
}

/**
 * Glass card component for content display
 */
export function GlassCard({
    children,
    style,
}: {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <AdaptiveGlass
            style={[styles.card, style]}
        >
            {children}
        </AdaptiveGlass>
    );
}

const styles = StyleSheet.create({
    glass: {
        overflow: 'hidden',
    },
    card: {
        borderRadius: 20,
        padding: 16,
    },
});
