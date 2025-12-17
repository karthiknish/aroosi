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
    Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { 
    colors, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { updateProfile, uploadProfilePhoto } from '../../services/api/profile';

// Onboarding steps
type OnboardingStep = 
    | 'profileFor' 
    | 'basicInfo' 
    | 'location' 
    | 'professional' 
    | 'physical' 
    | 'religious' 
    | 'photos' 
    | 'bio' 
    | 'complete';

interface OnboardingScreenProps {
    onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [step, setStep] = useState<OnboardingStep>('profileFor');
    const [isLoading, setIsLoading] = useState(false);
    
    // Form data
    const [profileFor, setProfileFor] = useState<'self' | 'friend' | 'family'>('self');
    const [fullName, setFullName] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [birthMonth, setBirthMonth] = useState('');
    const [birthDay, setBirthDay] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [preferredGender, setPreferredGender] = useState<'male' | 'female' | 'both' | ''>('');
    
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [origin, setOrigin] = useState('');
    
    const [education, setEducation] = useState('');
    const [occupation, setOccupation] = useState('');
    const [income, setIncome] = useState('');
    
    const [height, setHeight] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    
    const [religion, setReligion] = useState('');
    const [sect, setSect] = useState('');
    const [caste, setCaste] = useState('');
    const [motherTongue, setMotherTongue] = useState('');
    
    const [bio, setBio] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

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
            case 'profileFor':
                setStep('basicInfo');
                break;
            case 'basicInfo':
                if (!fullName.trim()) {
                    Alert.alert('Required', 'Please enter your full name');
                    return;
                }
                const age = calculateAge();
                if (!age || age < 18) {
                    Alert.alert('Error', 'You must be at least 18 years old');
                    return;
                }
                if (!gender) {
                    Alert.alert('Required', 'Please select your gender');
                    return;
                }
                setStep('location');
                break;
            case 'location':
                if (!city.trim() || !country.trim()) {
                    Alert.alert('Required', 'Please enter your city and country');
                    return;
                }
                setStep('professional');
                break;
            case 'professional':
                if (!education.trim() || !occupation.trim()) {
                    Alert.alert('Required', 'Please enter your education and occupation');
                    return;
                }
                setStep('physical');
                break;
            case 'physical':
                if (!height.trim() || !maritalStatus) {
                    Alert.alert('Required', 'Please enter your height and marital status');
                    return;
                }
                setStep('religious');
                break;
            case 'religious':
                if (!religion.trim() || !motherTongue.trim()) {
                    Alert.alert('Required', 'Please enter your religion and mother tongue');
                    return;
                }
                setStep('photos');
                break;
            case 'photos':
                if (photos.length === 0) {
                    Alert.alert('Required', 'Please upload at least one photo');
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
            case 'basicInfo':
                setStep('profileFor');
                break;
            case 'location':
                setStep('basicInfo');
                break;
            case 'professional':
                setStep('location');
                break;
            case 'physical':
                setStep('professional');
                break;
            case 'religious':
                setStep('physical');
                break;
            case 'photos':
                setStep('religious');
                break;
            case 'bio':
                setStep('photos');
                break;
        }
    };

    // Complete onboarding
    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const age = calculateAge();
            const dob = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
            
            await updateProfile({
                fullName: fullName.trim(),
                displayName: fullName.trim(),
                profileFor,
                age,
                dateOfBirth: dob,
                gender: gender || undefined,
                preferredGender: preferredGender || undefined,
                location: { 
                    city: city.trim(),
                    state: state.trim(),
                    country: country.trim(),
                    origin: origin.trim(),
                },
                education: education.trim(),
                occupation: occupation.trim(),
                income: income.trim(),
                height: height.trim(),
                maritalStatus,
                religion: religion.trim(),
                sect: sect.trim(),
                caste: caste.trim(),
                motherTongue: motherTongue.trim(),
                aboutMe: bio.trim() || undefined,
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
        const steps: OnboardingStep[] = [
            'profileFor', 
            'basicInfo', 
            'location', 
            'professional', 
            'physical', 
            'religious', 
            'photos', 
            'bio'
        ];
        const currentIndex = steps.indexOf(step);
        return ((currentIndex + 1) / steps.length) * 100;
    };

    // Handle photo upload
    const handleAddPhoto = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
        });

        if (result.assets && result.assets[0]?.uri) {
            const uri = result.assets[0].uri;
            setUploadingPhotos(true);
            try {
                const response = await uploadProfilePhoto(uri, photos.length);
                if (response.data?.url) {
                    setPhotos([...photos, response.data.url]);
                } else {
                    Alert.alert('Error', 'Failed to upload photo');
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to upload photo');
            } finally {
                setUploadingPhotos(false);
            }
        }
    };

    // Render step content
    const renderStepContent = () => {
        switch (step) {
            case 'profileFor':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Who are you creating this profile for?</Text>
                        <Text style={styles.stepDescription}>
                            This helps us tailor the experience for you
                        </Text>
                        <View style={styles.optionsGrid}>
                            {(['self', 'friend', 'family'] as const).map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.optionCard,
                                        profileFor === option && styles.optionCardSelected
                                    ]}
                                    onPress={() => setProfileFor(option)}
                                >
                                    <Text style={styles.optionEmoji}>
                                        {option === 'self' ? '👤' : option === 'friend' ? '🤝' : '👨‍👩‍👧‍👦'}
                                    </Text>
                                    <Text style={[
                                        styles.optionText,
                                        profileFor === option && styles.optionTextSelected
                                    ]}>
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'basicInfo':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Basic Information</Text>
                        <Text style={styles.stepDescription}>
                            Tell us a bit about yourself
                        </Text>
                        
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Your full name"
                            placeholderTextColor={colors.neutral[400]}
                            autoCapitalize="words"
                        />

                        <Text style={styles.label}>Birthday</Text>
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

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderOptions}>
                            {(['male', 'female'] as const).map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.genderOption,
                                        gender === g && styles.genderOptionSelected
                                    ]}
                                    onPress={() => setGender(g)}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        gender === g && styles.genderTextSelected
                                    ]}>{g === 'male' ? 'Man' : 'Woman'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            
            case 'location':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Where are you located?</Text>
                        <Text style={styles.stepDescription}>
                            This helps us find matches near you
                        </Text>
                        
                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="e.g. London"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Country</Text>
                        <TextInput
                            style={styles.input}
                            value={country}
                            onChangeText={setCountry}
                            placeholder="e.g. United Kingdom"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Origin / Ancestry (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={origin}
                            onChangeText={setOrigin}
                            placeholder="e.g. Punjabi, Bengali"
                            placeholderTextColor={colors.neutral[400]}
                        />
                    </View>
                );

            case 'professional':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Education & Profession</Text>
                        <Text style={styles.stepDescription}>
                            Share your professional background
                        </Text>
                        
                        <Text style={styles.label}>Highest Education</Text>
                        <TextInput
                            style={styles.input}
                            value={education}
                            onChangeText={setEducation}
                            placeholder="e.g. Masters in Computer Science"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Occupation</Text>
                        <TextInput
                            style={styles.input}
                            value={occupation}
                            onChangeText={setOccupation}
                            placeholder="e.g. Software Engineer"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Annual Income (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={income}
                            onChangeText={setIncome}
                            placeholder="e.g. £50,000 - £70,000"
                            placeholderTextColor={colors.neutral[400]}
                        />
                    </View>
                );

            case 'physical':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Physical Attributes</Text>
                        <Text style={styles.stepDescription}>
                            A few more details for your profile
                        </Text>
                        
                        <Text style={styles.label}>Height</Text>
                        <TextInput
                            style={styles.input}
                            value={height}
                            onChangeText={setHeight}
                            placeholder={'e.g. 5\'10" (178cm)'}
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Marital Status</Text>
                        <View style={styles.optionsGrid}>
                            {['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.optionCardSmall,
                                        maritalStatus === status && styles.optionCardSelected
                                    ]}
                                    onPress={() => setMaritalStatus(status)}
                                >
                                    <Text style={[
                                        styles.optionTextSmall,
                                        maritalStatus === status && styles.optionTextSelected
                                    ]}>{status}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'religious':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Religious & Cultural</Text>
                        <Text style={styles.stepDescription}>
                            These details are important for many members
                        </Text>
                        
                        <Text style={styles.label}>Religion</Text>
                        <TextInput
                            style={styles.input}
                            value={religion}
                            onChangeText={setReligion}
                            placeholder="e.g. Islam, Hinduism"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Mother Tongue</Text>
                        <TextInput
                            style={styles.input}
                            value={motherTongue}
                            onChangeText={setMotherTongue}
                            placeholder="e.g. Urdu, English, Hindi"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Sect / Caste (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={sect}
                            onChangeText={setSect}
                            placeholder="e.g. Sunni, Shia, Brahmin"
                            placeholderTextColor={colors.neutral[400]}
                        />
                    </View>
                );

            case 'photos':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Add Profile Photos</Text>
                        <Text style={styles.stepDescription}>
                            Profiles with photos get 10x more matches. At least 1 photo is required.
                        </Text>
                        
                        <View style={styles.photoGrid}>
                            {photos.map((url, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <Image source={{ uri: url }} style={styles.photo} />
                                    <TouchableOpacity 
                                        style={styles.removePhoto}
                                        onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                                    >
                                        <Text style={styles.removePhotoText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {photos.length < 6 && (
                                <TouchableOpacity 
                                    style={styles.addPhotoCard} 
                                    onPress={handleAddPhoto}
                                    disabled={uploadingPhotos}
                                >
                                    {uploadingPhotos ? (
                                        <ActivityIndicator color={colors.primary.DEFAULT} />
                                    ) : (
                                        <>
                                            <Text style={styles.addPhotoIcon}>+</Text>
                                            <Text style={styles.addPhotoText}>Add Photo</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            
            case 'bio':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>About Me</Text>
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
                {step !== 'profileFor' && (
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
        marginBottom: moderateScale(24),
    },
    label: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
        marginBottom: moderateScale(8),
        marginTop: moderateScale(16),
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
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    optionCard: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        padding: moderateScale(16),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[200],
    },
    optionCardSmall: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        paddingVertical: moderateScale(10),
        paddingHorizontal: moderateScale(16),
        borderWidth: 2,
        borderColor: colors.neutral[200],
    },
    optionCardSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: colors.primary[50],
    },
    optionEmoji: {
        fontSize: moderateScale(32),
        marginBottom: moderateScale(8),
    },
    optionText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    optionTextSmall: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    optionTextSelected: {
        color: colors.primary.DEFAULT,
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
    genderOptions: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    genderOption: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[200],
    },
    genderOptionSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: colors.primary[50],
    },
    genderText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    genderTextSelected: {
        color: colors.primary.DEFAULT,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    photoWrapper: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    removePhoto: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addPhotoCard: {
        width: '30%',
        aspectRatio: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.neutral[200],
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPhotoIcon: {
        fontSize: 32,
        color: colors.neutral[400],
    },
    addPhotoText: {
        fontSize: 10,
        color: colors.neutral[400],
        marginTop: 4,
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
