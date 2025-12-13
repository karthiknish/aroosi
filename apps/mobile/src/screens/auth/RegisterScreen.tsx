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
    Alert,
    ActivityIndicator,
    Linking,
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
import { registerWithEmail } from '../../services/api/auth';

export default function RegisterScreen({ navigation }: AuthStackScreenProps<'Register'>) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            const result = await registerWithEmail({
                email,
                password,
                displayName: name,
            });
            
            if (result.error) {
                Alert.alert('Registration Failed', result.error);
            }
            // Auth state listener in App.tsx will handle navigation
        } catch (error) {
            Alert.alert('Error', 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open the link');
        });
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
                            disabled={isLoading}
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
                                editable={!isLoading}
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
                                editable={!isLoading}
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
                                editable={!isLoading}
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
                                editable={!isLoading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.registerButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.terms}>
                            By creating an account, you agree to our{' '}
                            <Text 
                                style={styles.termsLink}
                                onPress={() => openLink('https://aroosi.app/terms')}
                            >
                                Terms of Service
                            </Text>{' '}and{' '}
                            <Text 
                                style={styles.termsLink}
                                onPress={() => openLink('https://aroosi.app/privacy')}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Login')}
                            disabled={isLoading}
                        >
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
    registerButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        marginTop: moderateScale(16),
        marginBottom: moderateScale(16),
        minHeight: responsiveValues.buttonMedium,
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    terms: {
        textAlign: 'center',
        color: colors.neutral[500],
        fontSize: responsiveFontSizes.sm,
        lineHeight: responsiveFontSizes.sm * 1.6,
    },
    termsLink: {
        color: colors.primary.DEFAULT,
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
