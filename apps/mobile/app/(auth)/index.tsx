/**
 * Welcome Screen - Initial auth screen
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import {
    colors,
    spacing,
    fontSize,
    fontWeight,
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '@/theme';

const AnimatedView = Animated.View;

export default function WelcomeScreen() {
    return (
        <LinearGradient
            colors={[colors.primary[700], colors.primary[900]]}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Logo/Brand */}
                    <AnimatedView
                        style={styles.brandContainer}
                        entering={FadeInDown.duration(600).delay(100)}
                    >
                        <Animated.Text
                            style={styles.logo}
                            entering={FadeIn.duration(800).delay(200)}
                        >
                            💍
                        </Animated.Text>
                        <Animated.Text
                            style={styles.title}
                            entering={FadeInUp.duration(600).delay(300)}
                        >
                            Aroosi
                        </Animated.Text>
                        <Animated.Text
                            style={styles.subtitle}
                            entering={FadeInUp.duration(600).delay(400)}
                        >
                            Find Your Perfect Match
                        </Animated.Text>
                    </AnimatedView>

                    {/* Features */}
                    <View style={styles.features}>
                        <Animated.Text
                            style={styles.featureText}
                            entering={FadeInUp.duration(500).delay(500)}
                        >
                            ✨ Personalized matches
                        </Animated.Text>
                        <Animated.Text
                            style={styles.featureText}
                            entering={FadeInUp.duration(500).delay(600)}
                        >
                            💬 Real conversations
                        </Animated.Text>
                        <Animated.Text
                            style={styles.featureText}
                            entering={FadeInUp.duration(500).delay(700)}
                        >
                            🔒 Privacy focused
                        </Animated.Text>
                    </View>

                    {/* Auth Buttons */}
                    <AnimatedView
                        style={styles.authButtons}
                        entering={FadeInUp.duration(600).delay(800)}
                    >
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push('/(auth)/register')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Create Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push('/(auth)/login')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>Sign In</Text>
                        </TouchableOpacity>
                    </AnimatedView>

                    {/* Terms */}
                    <Animated.Text
                        style={styles.terms}
                        entering={FadeIn.duration(800).delay(1000)}
                    >
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Animated.Text>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: responsiveValues.screenPadding,
        justifyContent: 'space-between',
        paddingTop: moderateScale(64),
        paddingBottom: moderateScale(32),
    },
    brandContainer: {
        alignItems: 'center',
    },
    logo: {
        fontSize: moderateScale(80),
        marginBottom: moderateScale(16),
    },
    title: {
        fontSize: responsiveFontSizes['4xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
        marginBottom: moderateScale(8),
    },
    subtitle: {
        fontSize: responsiveFontSizes.lg,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    features: {
        alignItems: 'center',
        gap: moderateScale(12),
    },
    featureText: {
        fontSize: responsiveFontSizes.base,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    authButtons: {
        gap: moderateScale(12),
    },
    primaryButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        minHeight: responsiveValues.buttonMedium,
    },
    primaryButtonText: {
        color: colors.primary[700],
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        minHeight: responsiveValues.buttonMedium,
    },
    secondaryButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    terms: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: responsiveFontSizes.xs,
        lineHeight: responsiveFontSizes.xs * 1.5,
    },
});
