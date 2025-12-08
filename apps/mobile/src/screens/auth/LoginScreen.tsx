/**
 * Login Screen
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
    ScrollView,
} from 'react-native';
import type { AuthStackScreenProps } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { useAuthStore } from '../../store';

export default function LoginScreen({ navigation }: AuthStackScreenProps<'Login'>) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setUser, setLoading, setError } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement Firebase auth login
            // For now, just simulate login
            setUser({
                id: '1',
                email,
                displayName: 'Test User',
                photoURL: null,
                phoneNumber: null,
            });
        } catch (error) {
            setError('Login failed. Please try again.');
        }
    };

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
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Login */}
                        <View style={styles.socialButtons}>
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                                <Text style={styles.socialButtonText}>🍎 Apple</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                                <Text style={styles.socialButtonText}>G Google</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
        paddingHorizontal: spacing[6],
        paddingTop: spacing[4],
        paddingBottom: spacing[8],
    },
    header: {
        marginBottom: spacing[8],
    },
    backButton: {
        marginBottom: spacing[6],
    },
    backButtonText: {
        fontSize: 28,
        color: colors.neutral[800],
    },
    title: {
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: spacing[2],
    },
    subtitle: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: spacing[4],
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
        marginBottom: spacing[2],
    },
    input: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        fontSize: fontSize.base,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: spacing[6],
    },
    forgotPasswordText: {
        color: colors.primary.DEFAULT,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    loginButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginBottom: spacing[6],
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing[6],
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.neutral[200],
    },
    dividerText: {
        color: colors.neutral[400],
        fontSize: fontSize.sm,
        paddingHorizontal: spacing[4],
    },
    socialButtons: {
        flexDirection: 'row',
        gap: spacing[3],
    },
    socialButton: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    socialButtonText: {
        fontSize: fontSize.base,
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: spacing[6],
    },
    footerText: {
        color: colors.neutral[500],
        fontSize: fontSize.base,
    },
    footerLink: {
        color: colors.primary.DEFAULT,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
});
