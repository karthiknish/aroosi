/**
 * Register Screen
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

export default function RegisterScreen({ navigation }: AuthStackScreenProps<'Register'>) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            // Handle validation
            return;
        }
        if (password !== confirmPassword) {
            // Handle password mismatch
            return;
        }
        // TODO: Implement Firebase registration
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
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start your journey to find love</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.neutral[400]}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

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
                                placeholder="Create a password"
                                placeholderTextColor={colors.neutral[400]}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor={colors.neutral[400]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.registerButtonText}>Create Account</Text>
                        </TouchableOpacity>

                        <Text style={styles.terms}>
                            By creating an account, you agree to our{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Sign In</Text>
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
    registerButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: spacing[4],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginTop: spacing[4],
        marginBottom: spacing[4],
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
    },
    terms: {
        textAlign: 'center',
        color: colors.neutral[500],
        fontSize: fontSize.sm,
        lineHeight: fontSize.sm * 1.6,
    },
    termsLink: {
        color: colors.primary.DEFAULT,
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
