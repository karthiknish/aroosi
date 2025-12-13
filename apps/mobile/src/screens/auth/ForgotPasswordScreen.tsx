/**
 * Forgot Password Screen - Password reset flow
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import type { AuthStackScreenProps } from '../../navigation/types';
import { 
    colors, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { forgotPassword } from '../../services/api/auth';

export default function ForgotPasswordScreen({ navigation }: AuthStackScreenProps<'ForgotPassword'>) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            const result = await forgotPassword(email);
            
            if (result.error) {
                Alert.alert('Error', result.error);
            } else {
                setEmailSent(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContainer}>
                    <Text style={styles.successEmoji}>📧</Text>
                    <Text style={styles.successTitle}>Check Your Email</Text>
                    <Text style={styles.successMessage}>
                        We've sent a password reset link to{'\n'}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>
                    <Text style={styles.successHint}>
                        Didn't receive the email? Check your spam folder or try again.
                    </Text>
                    
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.backButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={() => setEmailSent(false)}
                    >
                        <Text style={styles.resendButtonText}>Try Different Email</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backArrow}
                            disabled={isLoading}
                        >
                            <Text style={styles.backArrowText}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
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

                        <TouchableOpacity
                            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.resetButtonText}>Send Reset Link</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Remember your password? </Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Login')}
                            disabled={isLoading}
                        >
                            <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    content: {
        flex: 1,
        paddingHorizontal: responsiveValues.screenPadding,
        paddingTop: moderateScale(16),
        paddingBottom: moderateScale(32),
    },
    header: {
        marginBottom: moderateScale(32),
    },
    backArrow: {
        marginBottom: moderateScale(24),
    },
    backArrowText: {
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
        lineHeight: responsiveFontSizes.base * 1.5,
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: moderateScale(24),
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
    resetButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: responsiveValues.buttonMedium,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    resetButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
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
    // Success state styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: responsiveValues.screenPadding,
    },
    successEmoji: {
        fontSize: moderateScale(80),
        marginBottom: moderateScale(24),
    },
    successTitle: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(12),
    },
    successMessage: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
        textAlign: 'center',
        lineHeight: responsiveFontSizes.base * 1.5,
        marginBottom: moderateScale(8),
    },
    emailText: {
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
    },
    successHint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'center',
        marginBottom: moderateScale(32),
    },
    backButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(16),
        paddingHorizontal: moderateScale(48),
        borderRadius: borderRadius.xl,
        marginBottom: moderateScale(16),
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    resendButton: {
        paddingVertical: moderateScale(12),
    },
    resendButtonText: {
        color: colors.primary.DEFAULT,
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
    },
});
