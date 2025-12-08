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
import type { AuthStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export default function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
    return (
        <LinearGradient
            colors={[colors.primary[700], colors.primary[900]]}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Logo/Brand */}
                    <View style={styles.brandContainer}>
                        <Text style={styles.logo}>💍</Text>
                        <Text style={styles.title}>Aroosi</Text>
                        <Text style={styles.subtitle}>Find Your Perfect Match</Text>
                    </View>

                    {/* Features */}
                    <View style={styles.features}>
                        <Text style={styles.featureText}>✨ Personalized matches</Text>
                        <Text style={styles.featureText}>💬 Real conversations</Text>
                        <Text style={styles.featureText}>🔒 Privacy focused</Text>
                    </View>

                    {/* Auth Buttons */}
                    <View style={styles.authButtons}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Register')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Create Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => navigation.navigate('Login')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>
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
        paddingHorizontal: spacing[6],
        justifyContent: 'space-between',
        paddingTop: spacing[16],
        paddingBottom: spacing[8],
    },
    brandContainer: {
        alignItems: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: spacing[4],
    },
    title: {
        fontSize: fontSize['4xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
        marginBottom: spacing[2],
    },
    subtitle: {
        fontSize: fontSize.lg,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    features: {
        alignItems: 'center',
        gap: spacing[3],
    },
    featureText: {
        fontSize: fontSize.base,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    authButtons: {
        gap: spacing[3],
    },
    primaryButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: colors.primary[700],
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
    terms: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: fontSize.xs,
        lineHeight: fontSize.xs * 1.5,
    },
});
