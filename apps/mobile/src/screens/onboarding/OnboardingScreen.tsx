/**
 * Onboarding Screen - New user profile setup
 * Multi-step wizard for collecting essential profile information
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { 
    colors, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { updateProfile } from '../../services/api/profile';

// Onboarding steps
type OnboardingStep = 'name' | 'birthdate' | 'gender' | 'location' | 'bio' | 'complete';

interface OnboardingScreenProps {
    onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [step, setStep] = useState<OnboardingStep>('name');
    const [isLoading, setIsLoading] = useState(false);
    
    // Form data
    const [displayName, setDisplayName] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [city, setCity] = useState('');
    const [bio, setBio] = useState('');

    // Calculate age from birthdate
    const calculateAge = (): number | undefined => {
        if (!birthYear || !birthMonth || !birthDay) return undefined;
        const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Step navigation
    const nextStep = () => {
        switch (step) {
            case 'name':
                if (!displayName.trim()) {
                    Alert.alert('Required', 'Please enter your name');
                    return;
                }
                setStep('birthdate');
                break;
            case 'birthdate':
                const age = calculateAge();
                if (!age || age < 18) {
                    Alert.alert('Error', 'You must be at least 18 years old');
                    return;
                }
                if (age > 100) {
                    Alert.alert('Error', 'Please enter a valid birth date');
                    return;
                }
                setStep('gender');
                break;
            case 'gender':
                if (!gender) {
                    Alert.alert('Required', 'Please select your gender');
                    return;
                }
                setStep('location');
                break;
            case 'location':
                if (!city.trim()) {
                    Alert.alert('Required', 'Please enter your city');
                    return;
                }
                setStep('bio');
                break;
            case 'bio':
                handleComplete();
                break;
        }
    };

    const prevStep = () => {
        switch (step) {
            case 'birthdate':
                setStep('name');
                break;
            case 'gender':
                setStep('birthdate');
                break;
            case 'location':
                setStep('gender');
                break;
            case 'bio':
                setStep('location');
                break;
        }
    };

    // Complete onboarding
    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const age = calculateAge();
            await updateProfile({
                displayName: displayName.trim(),
                age,
                gender: gender || undefined,
                location: { city: city.trim() },
                bio: bio.trim() || undefined,
                onboardingComplete: true,
            });
            
            setStep('complete');
            setTimeout(() => {
                onComplete?.();
            }, 2000);
        } catch (error) {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Progress indicator
    const getProgress = (): number => {
        const steps = ['name', 'birthdate', 'gender', 'location', 'bio'];
        const currentIndex = steps.indexOf(step);
        return ((currentIndex + 1) / steps.length) * 100;
    };

    // Render step content
    const renderStepContent = () => {
        switch (step) {
            case 'name':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>What's your name?</Text>
                        <Text style={styles.stepDescription}>
                            This is how you'll appear to other members
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your name"
                            placeholderTextColor={colors.neutral[400]}
                            autoCapitalize="words"
                            maxLength={50}
                        />
                    </View>
                );
            
            case 'birthdate':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>When's your birthday?</Text>
                        <Text style={styles.stepDescription}>
                            Your age will be shown on your profile
                        </Text>
                        <View style={styles.dateInputRow}>
                            <TextInput
                                style={[styles.input, styles.dateInput]}
                                value={birthMonth}
                                onChangeText={setBirthMonth}
                                placeholder="MM"
                                placeholderTextColor={colors.neutral[400]}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            <TextInput
                                style={[styles.input, styles.dateInput]}
                                value={birthDay}
                                onChangeText={setBirthDay}
                                placeholder="DD"
                                placeholderTextColor={colors.neutral[400]}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            <TextInput
                                style={[styles.input, styles.yearInput]}
                                value={birthYear}
                                onChangeText={setBirthYear}
                                placeholder="YYYY"
                                placeholderTextColor={colors.neutral[400]}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                        </View>
                    </View>
                );
            
            case 'gender':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>I am a...</Text>
                        <Text style={styles.stepDescription}>
                            This helps us find the right matches for you
                        </Text>
                        <View style={styles.genderOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.genderOption,
                                    gender === 'male' && styles.genderOptionSelected
                                ]}
                                onPress={() => setGender('male')}
                            >
                                <Text style={styles.genderEmoji}>👨</Text>
                                <Text style={[
                                    styles.genderText,
                                    gender === 'male' && styles.genderTextSelected
                                ]}>Man</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.genderOption,
                                    gender === 'female' && styles.genderOptionSelected
                                ]}
                                onPress={() => setGender('female')}
                            >
                                <Text style={styles.genderEmoji}>👩</Text>
                                <Text style={[
                                    styles.genderText,
                                    gender === 'female' && styles.genderTextSelected
                                ]}>Woman</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            
            case 'location':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Where do you live?</Text>
                        <Text style={styles.stepDescription}>
                            We'll show you people nearby
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="City name"
                            placeholderTextColor={colors.neutral[400]}
                            autoCapitalize="words"
                            maxLength={100}
                        />
                    </View>
                );
            
            case 'bio':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Tell us about yourself</Text>
                        <Text style={styles.stepDescription}>
                            Write a short bio to help others get to know you
                        </Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="I love traveling, cooking, and..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{bio.length}/500</Text>
                        <Text style={styles.skipHint}>You can skip this and add later</Text>
                    </View>
                );
            
            case 'complete':
                return (
                    <View style={styles.completeContent}>
                        <Text style={styles.completeEmoji}>🎉</Text>
                        <Text style={styles.completeTitle}>You're all set!</Text>
                        <Text style={styles.completeDescription}>
                            Your profile is ready. Start exploring matches!
                        </Text>
                    </View>
                );
        }
    };

    if (step === 'complete') {
        return (
            <SafeAreaView style={styles.container}>
                {renderStepContent()}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
                    </View>
                </View>

                {/* Back button */}
                {step !== 'name' && (
                    <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                )}

                {/* Step content */}
                {renderStepContent()}

                {/* Continue button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                        onPress={nextStep}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.continueButtonText}>
                                {step === 'bio' ? 'Complete Profile' : 'Continue'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: responsiveValues.screenPadding,
        paddingTop: moderateScale(16),
        paddingBottom: moderateScale(32),
    },
    progressContainer: {
        marginBottom: moderateScale(24),
    },
    progressTrack: {
        height: 4,
        backgroundColor: colors.neutral[200],
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
        borderRadius: 2,
    },
    backButton: {
        marginBottom: moderateScale(16),
    },
    backButtonText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
    },
    stepContent: {
        flex: 1,
        paddingTop: moderateScale(24),
    },
    stepTitle: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(8),
    },
    stepDescription: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        marginBottom: moderateScale(32),
    },
    input: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.lg,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    dateInputRow: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    dateInput: {
        flex: 1,
        textAlign: 'center',
    },
    yearInput: {
        flex: 1.5,
        textAlign: 'center',
    },
    bioInput: {
        minHeight: moderateScale(120),
        paddingTop: moderateScale(16),
    },
    charCount: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(4),
    },
    skipHint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'center',
        marginTop: moderateScale(16),
    },
    genderOptions: {
        flexDirection: 'row',
        gap: moderateScale(16),
    },
    genderOption: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        padding: moderateScale(24),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[200],
    },
    genderOptionSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: colors.primary[50],
    },
    genderEmoji: {
        fontSize: moderateScale(48),
        marginBottom: moderateScale(8),
    },
    genderText: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    genderTextSelected: {
        color: colors.primary.DEFAULT,
    },
    footer: {
        marginTop: 'auto',
        paddingTop: moderateScale(24),
    },
    continueButton: {
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
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
    },
    // Complete state
    completeContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeEmoji: {
        fontSize: moderateScale(80),
        marginBottom: moderateScale(24),
    },
    completeTitle: {
        fontSize: responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(12),
    },
    completeDescription: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        textAlign: 'center',
    },
});
