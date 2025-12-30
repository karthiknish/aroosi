/**
 * Login Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import type { AuthStackScreenProps } from '../../navigation/types';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { useAuthStore } from '../../store';
import { loginWithEmail, loginWithGoogle } from '../../services/api/auth';
import { loginWithApple, isAppleSignInAvailable } from '../../services/api/appleAuth';
import { useOffline } from '../../hooks/useOffline';
import { useAsyncActions } from '../../hooks/useAsyncAction';

export default function LoginScreen({ navigation }: AuthStackScreenProps<'Login'>) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
    const { setError } = useAuthStore();
    const { checkNetworkOrAlert } = useOffline();

    // Unified loading states for all login methods
    const { loading, execute } = useAsyncActions({
        email: async () => {
            const result = await loginWithEmail({ email, password });
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
        google: async () => {
            const result = await loginWithGoogle();
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
        apple: async () => {
            const result = await loginWithApple();
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
    }, { 
        errorMode: 'alert',
        errorTitle: 'Login Failed',
        networkAware: true,
    });

    // Combined loading state
    const isLoading = loading.email || loading.google || loading.apple;

    // Check Apple Sign-In availability on mount
    useEffect(() => {
        isAppleSignInAvailable().then(setAppleSignInAvailable);
    }, []);

    const handleLogin = useCallback(async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (!checkNetworkOrAlert(() => handleLogin())) return;
        await execute.email();
    }, [email, password, checkNetworkOrAlert, execute]);

    const handleGoogleLogin = useCallback(async () => {
        if (!checkNetworkOrAlert(() => handleGoogleLogin())) return;
        await execute.google();
    }, [checkNetworkOrAlert, execute]);

    const handleAppleLogin = useCallback(async () => {
        if (!checkNetworkOrAlert(() => handleAppleLogin())) return;
        await execute.apple();
    }, [checkNetworkOrAlert, execute]);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            disabled={isLoading}
                        >
                            <Text style={styles.backButtonText}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.neutral[400]}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.neutral[400]}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                editable={!isLoading}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => navigation.navigate('ForgotPassword')}
                            disabled={isLoading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Login */}
                        <View style={styles.socialButtons}>
                            {appleSignInAvailable && (
                                <TouchableOpacity 
                                    style={styles.socialButton} 
                                    activeOpacity={0.8}
                                    onPress={handleAppleLogin}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.socialButtonText}>🍎 Apple</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={styles.socialButton} 
                                activeOpacity={0.8}
                                onPress={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <Text style={styles.socialButtonText}>G Google</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Register')}
                            disabled={isLoading}
                        >
                            <Text style={styles.footerLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: responsiveValues.screenPadding,
        paddingTop: moderateScale(16),
        paddingBottom: moderateScale(32),
    },
    header: {
        marginBottom: moderateScale(32),
    },
    backButton: {
        marginBottom: moderateScale(24),
    },
    backButtonText: {
        fontSize: moderateScale(28),
        color: colors.neutral[800],
    },
    title: {
        fontSize: responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(8),
    },
    subtitle: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: moderateScale(16),
    },
    label: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
        marginBottom: moderateScale(8),
    },
    input: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: moderateScale(24),
    },
    forgotPasswordText: {
        color: colors.primary.DEFAULT,
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
    },
    loginButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginBottom: moderateScale(24),
        minHeight: responsiveValues.buttonMedium,
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(24),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.neutral[200],
    },
    dividerText: {
        color: colors.neutral[400],
        fontSize: responsiveFontSizes.sm,
        paddingHorizontal: moderateScale(16),
    },
    socialButtons: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    socialButton: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
        minHeight: responsiveValues.buttonMedium,
    },
    socialButtonText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: moderateScale(24),
    },
    footerText: {
        color: colors.neutral[500],
        fontSize: responsiveFontSizes.base,
    },
    footerLink: {
        color: colors.primary.DEFAULT,
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
});
