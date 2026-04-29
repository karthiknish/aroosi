/**
 * Onboarding Screen - New user profile setup
 * Multi-step wizard for collecting essential profile information
 */

import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {
    colors,
    fontWeight,
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '@/theme';
import { updateProfile, uploadProfilePhoto } from '@/services/api/profile';
import { useAuthStore } from '@/store';
import {
    validateName,
    validateCity,
    validateDateOfBirth,
} from '@/utils/validation';
import { nowTimestamp } from '@/utils/timestamp';

// Onboarding steps
type OnboardingStep =
    | 'profileFor'
    | 'basicInfo'
    | 'location'
    | 'professional'
    | 'physical'
    | 'religious'
    | 'lifestyle'
    | 'partnerPreferences'
    | 'photos'
    | 'bio'
    | 'complete';

export default function OnboardingScreen() {
    const { setOnboardingComplete } = useAuthStore();
    const [step, setStep] = useState<OnboardingStep>('profileFor');
    const [isLoading, setIsLoading] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const stepIndex = [
        'profileFor', 'basicInfo', 'location', 'professional', 'physical',
        'religious', 'lifestyle', 'partnerPreferences', 'photos', 'bio'
    ].indexOf(step);

    // Animate content on step change
    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        progressAnim.setValue((stepIndex / 10) * 100);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(progressAnim, {
                toValue: ((stepIndex + 1) / 10) * 100,
                tension: 40,
                friction: 7,
                useNativeDriver: false,
            }),
        ]).start();
    }, [fadeAnim, progressAnim, slideAnim, stepIndex]);

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

    const [height, setHeight] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');

    const [religion, setReligion] = useState('');
    const [sect, setSect] = useState('');
    const [caste, setCaste] = useState('');
    const [motherTongue, setMotherTongue] = useState('');

    const [diet, setDiet] = useState<'vegetarian' | 'non-vegetarian' | 'vegan' | 'halal' | 'other' | ''>('');
    const [smoking, setSmoking] = useState<'no' | 'occasionally' | 'yes' | ''>('');
    const [drinking, setDrinking] = useState<'no' | 'occasionally' | 'yes' | ''>('');

    const [partnerPreferenceAgeMin, setPartnerPreferenceAgeMin] = useState('18');
    const [partnerPreferenceAgeMax, setPartnerPreferenceAgeMax] = useState('99');

    const [phoneNumber, setPhoneNumber] = useState('');

    const [bio, setBio] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

    // Calculate age from birthdate
    const calculateAge = (): number | undefined => {
        if (!birthYear || !birthMonth || !birthDay) return undefined;
        const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
        const today = new Date(nowTimestamp());
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
            case 'basicInfo': {
                const nameResult = validateName(fullName);
                if (!nameResult.valid) {
                    Alert.alert('Invalid Name', nameResult.error || 'Please enter a valid name');
                    return;
                }
                const dobResult = validateDateOfBirth(birthYear, birthMonth, birthDay);
                if (!dobResult.valid) {
                    Alert.alert('Invalid Date', dobResult.error || 'Please enter a valid date of birth');
                    return;
                }
                if (!gender) {
                    Alert.alert('Required', 'Please select your gender');
                    return;
                }
                if (!preferredGender) {
                    Alert.alert('Required', 'Please select who you are interested in');
                    return;
                }
                const phoneDigits = phoneNumber.replace(/\D/g, '');
                if (phoneDigits.length < 10 || phoneDigits.length > 15) {
                    Alert.alert('Invalid Phone', 'Please enter a valid phone number (10-15 digits)');
                    return;
                }
                setStep('location');
                break;
            }
            case 'location': {
                const cityResult = validateCity(city);
                if (!cityResult.valid) {
                    Alert.alert('Invalid City', cityResult.error || 'Please enter a valid city');
                    return;
                }
                setStep('professional');
                break;
            }
            case 'professional':
                setStep('physical');
                break;
            case 'physical':
                setStep('religious');
                break;
            case 'religious':
                setStep('lifestyle');
                break;
            case 'lifestyle':
                setStep('partnerPreferences');
                break;
            case 'partnerPreferences':
                setStep('photos');
                break;
            case 'photos':
                if (uploadingPhotos) {
                    Alert.alert('Please wait', 'Your photos are still uploading.');
                    return;
                }
                if (photos.length === 0) {
                    Alert.alert('Required', 'Please upload at least one photo before continuing.');
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
        const steps: OnboardingStep[] = ['profileFor', 'basicInfo', 'location', 'professional', 'physical', 'religious', 'lifestyle', 'partnerPreferences', 'photos', 'bio', 'complete'];
        const currentIndex = steps.indexOf(step);
        if (currentIndex > 0) {
            setStep(steps[currentIndex - 1]);
        }
    };

    const handlePhotoUpload = async () => {
        setUploadingPhotos(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets) {
                const uploadPromises = result.assets
                    .filter((asset): asset is ImagePicker.ImagePickerAsset => asset.uri !== undefined)
                    .map(async (asset, index) => {
                        const response = await uploadProfilePhoto(asset.uri, photos.length + index);
                        return response.data?.url;
                    });

                const urls = await Promise.all(uploadPromises);
                setPhotos([...photos, ...urls.filter((url): url is string => url !== undefined)]);
            }
        } catch {
            Alert.alert('Error', 'Failed to upload photos');
        } finally {
            setUploadingPhotos(false);
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const age = calculateAge();

            await updateProfile({
                displayName: fullName,
                dateOfBirth: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`,
                age,
                gender: gender || undefined,
                preferredGender: preferredGender || undefined,
                location: {
                    city,
                    state,
                    country,
                    origin,
                },
                education,
                occupation,
                height: height || undefined,
                maritalStatus: maritalStatus || undefined,
                religion,
                sect,
                caste,
                motherTongue,
                bio,
                onboardingComplete: true,
            });

            setOnboardingComplete();
            router.replace('/(tabs)');
        } catch {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderStep = () => {
        const animatedStyle = {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
        };

        switch (step) {
            case 'profileFor':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Who is this profile for?</Text>
                        <TouchableOpacity
                            style={[styles.optionCard, profileFor === 'self' && styles.optionCardSelected]}
                            onPress={() => setProfileFor('self')}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionEmoji}>👤</Text>
                                <Text style={styles.optionTitle}>Myself</Text>
                                <Text style={styles.optionDescription}>I'm creating my own profile</Text>
                            </View>
                            {profileFor === 'self' && <View style={styles.checkmark}>✓</View>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionCard, profileFor === 'friend' && styles.optionCardSelected]}
                            onPress={() => setProfileFor('friend')}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionEmoji}>👥</Text>
                                <Text style={styles.optionTitle}>A Friend</Text>
                                <Text style={styles.optionDescription}>Helping a friend create profile</Text>
                            </View>
                            {profileFor === 'friend' && <View style={styles.checkmark}>✓</View>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionCard, profileFor === 'family' && styles.optionCardSelected]}
                            onPress={() => setProfileFor('family')}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionEmoji}>👨‍👩‍👧‍👦</Text>
                                <Text style={styles.optionTitle}>Family Member</Text>
                                <Text style={styles.optionDescription}>Creating for a family member</Text>
                            </View>
                            {profileFor === 'family' && <View style={styles.checkmark}>✓</View>}
                        </TouchableOpacity>
                    </Animated.View>
                );

            case 'basicInfo':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.neutral[400]}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <Text style={styles.label}>Date of Birth</Text>
                        <View style={styles.dobContainer}>
                            <TextInput
                                style={styles.dobInput}
                                placeholder="YYYY"
                                placeholderTextColor={colors.neutral[400]}
                                value={birthYear}
                                onChangeText={setBirthYear}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                            <TextInput
                                style={styles.dobInput}
                                placeholder="MM"
                                placeholderTextColor={colors.neutral[400]}
                                value={birthMonth}
                                onChangeText={setBirthMonth}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            <TextInput
                                style={styles.dobInput}
                                placeholder="DD"
                                placeholderTextColor={colors.neutral[400]}
                                value={birthDay}
                                onChangeText={setBirthDay}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                        </View>

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderContainer}>
                            <TouchableOpacity
                                style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                                onPress={() => setGender('male')}
                            >
                                <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                                onPress={() => setGender('female')}
                            >
                                <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Interested In</Text>
                        <View style={styles.genderContainer}>
                            <TouchableOpacity
                                style={[styles.genderButton, preferredGender === 'male' && styles.genderButtonSelected]}
                                onPress={() => setPreferredGender('male')}
                            >
                                <Text style={[styles.genderText, preferredGender === 'male' && styles.genderTextSelected]}>Men</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderButton, preferredGender === 'female' && styles.genderButtonSelected]}
                                onPress={() => setPreferredGender('female')}
                            >
                                <Text style={[styles.genderText, preferredGender === 'female' && styles.genderTextSelected]}>Women</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderButton, preferredGender === 'both' && styles.genderButtonSelected]}
                                onPress={() => setPreferredGender('both')}
                            >
                                <Text style={[styles.genderText, preferredGender === 'both' && styles.genderTextSelected]}>Both</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter phone number"
                                placeholderTextColor={colors.neutral[400]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </Animated.View>
                );

            case 'location':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Location</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your city"
                                placeholderTextColor={colors.neutral[400]}
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>State/Region</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter state or region"
                                placeholderTextColor={colors.neutral[400]}
                                value={state}
                                onChangeText={setState}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Country</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter country"
                                placeholderTextColor={colors.neutral[400]}
                                value={country}
                                onChangeText={setCountry}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Origin/Ethnicity (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your origin"
                                placeholderTextColor={colors.neutral[400]}
                                value={origin}
                                onChangeText={setOrigin}
                            />
                        </View>
                    </Animated.View>
                );

            case 'professional':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Professional Info</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Education</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Highest education level"
                                placeholderTextColor={colors.neutral[400]}
                                value={education}
                                onChangeText={setEducation}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Occupation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Current occupation"
                                placeholderTextColor={colors.neutral[400]}
                                value={occupation}
                                onChangeText={setOccupation}
                            />
                        </View>
                    </Animated.View>
                );

            case 'physical':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Physical Attributes</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter height in cm"
                                placeholderTextColor={colors.neutral[400]}
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Marital Status</Text>
                            <View style={styles.optionsContainer}>
                                {['Never Married', 'Divorced', 'Widowed', 'Separated'].map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[styles.optionCardSmall, maritalStatus === status && styles.optionCardSmallSelected]}
                                        onPress={() => setMaritalStatus(status)}
                                    >
                                        <Text style={[styles.optionCardSmallText, maritalStatus === status && styles.optionCardSmallTextSelected]}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                );

            case 'religious':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Religious & Cultural</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Religion</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your religion"
                                placeholderTextColor={colors.neutral[400]}
                                value={religion}
                                onChangeText={setReligion}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Sect/Denomination (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter sect"
                                placeholderTextColor={colors.neutral[400]}
                                value={sect}
                                onChangeText={setSect}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Caste (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter caste"
                                placeholderTextColor={colors.neutral[400]}
                                value={caste}
                                onChangeText={setCaste}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mother Tongue</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mother tongue"
                                placeholderTextColor={colors.neutral[400]}
                                value={motherTongue}
                                onChangeText={setMotherTongue}
                            />
                        </View>
                    </Animated.View>
                );

            case 'lifestyle':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Lifestyle</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Diet</Text>
                            <View style={styles.optionsContainer}>
                                {(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Halal'] as const).map((dietOption) => (
                                    <TouchableOpacity
                                        key={dietOption}
                                        style={[styles.optionCardSmall, diet === dietOption.toLowerCase() && styles.optionCardSmallSelected]}
                                        onPress={() => setDiet(dietOption.toLowerCase() as typeof diet)}
                                    >
                                        <Text style={[styles.optionCardSmallText, diet === dietOption.toLowerCase() && styles.optionCardSmallTextSelected]}>
                                            {dietOption}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Smoking</Text>
                            <View style={styles.optionsContainer}>
                                {(['No', 'Occasionally', 'Yes'] as const).map((smokingOption) => (
                                    <TouchableOpacity
                                        key={smokingOption}
                                        style={[styles.optionCardSmall, smoking === smokingOption.toLowerCase() && styles.optionCardSmallSelected]}
                                        onPress={() => setSmoking(smokingOption.toLowerCase() as typeof smoking)}
                                    >
                                        <Text style={[styles.optionCardSmallText, smoking === smokingOption.toLowerCase() && styles.optionCardSmallTextSelected]}>
                                            {smokingOption}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Drinking</Text>
                            <View style={styles.optionsContainer}>
                                {(['No', 'Occasionally', 'Yes'] as const).map((drinkingOption) => (
                                    <TouchableOpacity
                                        key={drinkingOption}
                                        style={[styles.optionCardSmall, drinking === drinkingOption.toLowerCase() && styles.optionCardSmallSelected]}
                                        onPress={() => setDrinking(drinkingOption.toLowerCase() as typeof drinking)}
                                    >
                                        <Text style={[styles.optionCardSmallText, drinking === drinkingOption.toLowerCase() && styles.optionCardSmallTextSelected]}>
                                            {drinkingOption}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                );

            case 'partnerPreferences':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Partner Preferences</Text>

                        <Text style={styles.label}>Preferred Age Range</Text>
                        <View style={styles.ageRangeContainer}>
                            <TextInput
                                style={styles.ageInput}
                                placeholder="Min"
                                placeholderTextColor={colors.neutral[400]}
                                value={partnerPreferenceAgeMin}
                                onChangeText={setPartnerPreferenceAgeMin}
                                keyboardType="number-pad"
                            />
                            <Text style={styles.ageSeparator}>to</Text>
                            <TextInput
                                style={styles.ageInput}
                                placeholder="Max"
                                placeholderTextColor={colors.neutral[400]}
                                value={partnerPreferenceAgeMax}
                                onChangeText={setPartnerPreferenceAgeMax}
                                keyboardType="number-pad"
                            />
                        </View>
                    </Animated.View>
                );

            case 'photos':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Add Photos</Text>
                        <Text style={styles.stepDescription}>Add at least one photo to get started</Text>

                        <View style={styles.photosContainer}>
                            {photos.map((photo, index) => (
                                <View key={photo} style={styles.photoWrapper}>
                                    <Image source={{ uri: photo }} style={styles.photo} />
                                    <TouchableOpacity
                                        style={styles.removePhotoButton}
                                        onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                                    >
                                        <Text style={styles.removePhotoText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {photos.length < 6 && (
                                <TouchableOpacity
                                    style={styles.addPhotoButton}
                                    onPress={handlePhotoUpload}
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
                    </Animated.View>
                );

            case 'bio':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>About Yourself</Text>
                        <Text style={styles.stepDescription}>Write a short bio to help others know you better</Text>

                        <TextInput
                            style={styles.bioInput}
                            placeholder="Tell us about yourself, your interests, hobbies, and what you're looking for..."
                            placeholderTextColor={colors.neutral[400]}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                    </Animated.View>
                );

            case 'complete':
                return (
                    <Animated.View style={[styles.stepContainer, animatedStyle]}>
                        <Text style={styles.stepTitle}>Setup Complete!</Text>
                        <Text style={styles.stepDescription}>
                            Your profile has been created. You can now start browsing and connecting with potential matches.
                        </Text>
                    </Animated.View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primary[50], colors.background.light]}
                style={styles.gradient}
            />

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                            }) },
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    Step {stepIndex + 1} of 10
                </Text>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
            >
                {renderStep()}
            </ScrollView>

            {/* Navigation */}
            <View style={styles.navigation}>
                {step !== 'profileFor' && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={prevStep}
                        disabled={isLoading}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
                    onPress={nextStep}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.nextButtonText}>
                            {step === 'bio' ? 'Complete' : 'Continue'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 300,
    },
    progressContainer: {
        paddingHorizontal: responsiveValues.screenPadding,
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(16),
    },
    progressBar: {
        height: moderateScale(6),
        backgroundColor: colors.neutral[200],
        borderRadius: moderateScale(3),
        overflow: 'hidden',
        marginBottom: moderateScale(8),
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
    },
    progressText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: responsiveValues.screenPadding,
        paddingBottom: moderateScale(100),
    },
    stepContainer: {
        minHeight: moderateScale(300),
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
        lineHeight: responsiveFontSizes.base * 1.5,
    },
    inputGroup: {
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
    dobContainer: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    dobInput: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        textAlign: 'center',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    genderButton: {
        flex: 1,
        paddingVertical: moderateScale(14),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        alignItems: 'center',
    },
    genderButtonSelected: {
        backgroundColor: colors.primary.DEFAULT,
        borderColor: colors.primary.DEFAULT,
    },
    genderText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
    genderTextSelected: {
        color: '#FFFFFF',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    optionCardSmall: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(10),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        backgroundColor: '#FFFFFF',
    },
    optionCardSmallSelected: {
        backgroundColor: colors.primary.DEFAULT,
        borderColor: colors.primary.DEFAULT,
    },
    optionCardSmallText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
    optionCardSmallTextSelected: {
        color: '#FFFFFF',
    },
    optionCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        marginBottom: moderateScale(12),
        borderWidth: 1,
        borderColor: colors.neutral[200],
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionCardSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: colors.primary[50],
    },
    optionContent: {
        flex: 1,
    },
    optionEmoji: {
        fontSize: moderateScale(32),
        marginBottom: moderateScale(8),
    },
    optionTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    optionDescription: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    checkmark: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: moderateScale(12),
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ageRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(12),
    },
    ageInput: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        textAlign: 'center',
    },
    ageSeparator: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
    },
    photosContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    photoWrapper: {
        width: moderateScale(100),
        height: moderateScale(100),
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.lg,
    },
    removePhotoButton: {
        position: 'absolute',
        top: moderateScale(-8),
        right: moderateScale(-8),
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: moderateScale(12),
        backgroundColor: colors.neutral[800],
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
    },
    addPhotoButton: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.neutral[200],
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPhotoIcon: {
        fontSize: moderateScale(32),
        color: colors.neutral[400],
        marginBottom: moderateScale(4),
    },
    addPhotoText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'center',
    },
    bioInput: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        borderWidth: 1,
        borderColor: colors.neutral[200],
        minHeight: moderateScale(150),
    },
    navigation: {
        flexDirection: 'row',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        gap: moderateScale(12),
        backgroundColor: colors.background.light,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[200],
    },
    backButton: {
        flex: 1,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
    },
    nextButton: {
        flex: 2,
        backgroundColor: colors.primary.DEFAULT,
        paddingVertical: moderateScale(16),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
