/**
 * GlassView Component - Adaptive glass effect with fallback
 *
 * Uses expo-glass-effect on iOS 26+ with liquid glass,
 * falls back to expo-blur BlurView on older versions.
 */

import React from 'react';
import { View, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView as ExpoGlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { borderRadius } from '@/theme';

export interface GlassViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    tint?: 'systemMaterial' | 'systemThinMaterial' | 'systemUltraThinMaterial' | 'systemThickMaterial' | 'systemChromeMaterial' | 'light' | 'dark' | 'default' | 'extraLight';
    isInteractive?: boolean;
    borderRadius?: number;
}

/**
 * Adaptive glass component that uses liquid glass on iOS 26+ and BlurView as fallback
 */
export function GlassView({
    children,
    style,
    intensity = 80,
    tint = 'systemMaterial',
    isInteractive = false,
    borderRadius: borderRadiusProp,
}: GlassViewProps) {
    const containerStyle: ViewStyle = {
        ...(borderRadiusProp && { borderRadius: borderRadiusProp, overflow: 'hidden' as const }),
    };

    // Use liquid glass on iOS 26+ if available
    if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
        return (
            <ExpoGlassView
                isInteractive={isInteractive}
                style={[containerStyle, style]}
            >
                {children}
            </ExpoGlassView>
        );
    }

    // Fallback to BlurView
    return (
        <BlurView
            tint={tint}
            intensity={intensity}
            style={[containerStyle, style]}
        >
            {children}
        </BlurView>
    );
}

/**
 * Glass button with pressable interaction
 */
export interface GlassButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    size?: number;
}

export function GlassButton({ children, onPress, style, size = 44 }: GlassButtonProps) {
    const buttonStyle: ViewStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
    };

    if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
        return (
            <ExpoGlassView
                isInteractive
                style={[buttonStyle, style]}
            >
                <GlassButtonInner onPress={onPress}>
                    {children}
                </GlassButtonInner>
            </ExpoGlassView>
        );
    }

    return (
        <BlurView
            tint="systemMaterial"
            intensity={80}
            style={[buttonStyle, style]}
        >
            <GlassButtonInner onPress={onPress}>
                {children}
            </GlassButtonInner>
        </BlurView>
    );
}

function GlassButtonInner({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
    return React.createElement(
        require('react-native').Pressable,
        { onPress, style: { padding: 4 } },
        children
    );
}

/**
 * Glass card component for content containers
 */
export interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    padding?: number;
}

export function GlassCard({ children, style, padding = 16 }: GlassCardProps) {
    const cardStyle: ViewStyle = {
        borderRadius: borderRadius.xl,
        padding,
    };

    return (
        <GlassView style={[cardStyle, style]}>
            {children}
        </GlassView>
    );
}

/**
 * Glass overlay for image/text overlays
 */
export interface GlassOverlayProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    position?: 'top' | 'bottom' | 'full';
    intensity?: number;
}

export function GlassOverlay({
    children,
    style,
    position = 'bottom',
    intensity = 80,
}: GlassOverlayProps) {
    const overlayStyle: ViewStyle = {
        position: 'absolute',
        ...(position === 'top' && { top: 0 }),
        ...(position === 'bottom' && { bottom: 0 }),
        ...(position === 'full' && { top: 0, bottom: 0 }),
        left: 0,
        right: 0,
    };

    return (
        <GlassView
            intensity={intensity}
            tint="systemUltraThinMaterial"
            style={[overlayStyle, style]}
        >
            {children}
        </GlassView>
    );
}

export default GlassView;
