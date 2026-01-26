/**
 * Onboarding Screen - New user profile setup
 * Multi-step wizard for collecting essential profile information
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    Animated,
    Dimensions,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { 
    colors, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { updateProfile, uploadProfilePhoto } from '../../services/api/profile';
import {
    validateName,
    validateCity,
    validateDateOfBirth,
    validateHeight,
    validateEducation,
    validateOccupation,
} from '../../utils/validation';
import { nowTimestamp } from '../../utils/timestamp';

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

interface OnboardingScreenProps {
    onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
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
    }, [step]);
    
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
    const [physicalStatus, setPhysicalStatus] = useState<'normal' | 'differently-abled' | ''>('');

    const [religion, setReligion] = useState('');
    const [sect, setSect] = useState('');
    const [caste, setCaste] = useState('');
    const [motherTongue, setMotherTongue] = useState('');
    const [ethnicity, setEthnicity] = useState('');

    // Lifestyle
    const [diet, setDiet] = useState<'vegetarian' | 'non-vegetarian' | 'vegan' | 'halal' | 'other' | ''>('');
    const [smoking, setSmoking] = useState<'no' | 'occasionally' | 'yes' | ''>('');
    const [drinking, setDrinking] = useState<'no' | 'occasionally' | 'yes' | ''>('');

    // Partner preferences
    const [partnerPreferenceAgeMin, setPartnerPreferenceAgeMin] = useState('18');
    const [partnerPreferenceAgeMax, setPartnerPreferenceAgeMax] = useState('99');

    // Contact
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
            case 'basicInfo':
                // Validate name with proper format checking
                const nameResult = validateName(fullName);
                if (!nameResult.valid) {
                    Alert.alert('Invalid Name', nameResult.error || 'Please enter a valid name');
                    return;
                }
                // Validate date of birth with proper calendar/age checking
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
                // Validate phone number (10-15 digits)
                const phoneDigits = phoneNumber.replace(/\D/g, '');
                if (phoneDigits.length < 10 || phoneDigits.length > 15) {
                    Alert.alert('Invalid Phone', 'Please enter a valid phone number (10-15 digits)');
                    return;
                }
                setStep('location');
                break;
            case 'location':
                // Validate city with proper format checking
                const cityResult = validateCity(city);
                if (!cityResult.valid) {
                    Alert.alert('Invalid City', cityResult.error || 'Please enter a valid city');
                    return;
                }
                if (!country.trim()) {
                    Alert.alert('Required', 'Please enter your country');
                    return;
                }
                setStep('professional');
                break;
            case 'professional':
                // Validate education with length checking
                const eduResult = validateEducation(education);
                if (!eduResult.valid) {
                    Alert.alert('Invalid Education', eduResult.error || 'Please enter valid education');
                    return;
                }
                // Validate occupation with length checking
                const occResult = validateOccupation(occupation);
                if (!occResult.valid) {
                    Alert.alert('Invalid Occupation', occResult.error || 'Please enter valid occupation');
                    return;
                }
                setStep('physical');
                break;
            case 'physical':
                // Validate height with proper format checking
                const heightResult = validateHeight(height);
                if (!heightResult.valid) {
                    Alert.alert('Invalid Height', heightResult.error || 'Please enter valid height');
                    return;
                }
                if (!maritalStatus) {
                    Alert.alert('Required', 'Please select your marital status');
                    return;
                }
                setStep('religious');
                break;
            case 'religious':
                if (!religion.trim() || !motherTongue.trim()) {
                    Alert.alert('Required', 'Please enter your religion and mother tongue');
                    return;
                }
                setStep('lifestyle');
                break;
            case 'lifestyle':
                setStep('partnerPreferences');
                break;
            case 'partnerPreferences':
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
            case 'lifestyle':
                setStep('religious');
                break;
            case 'partnerPreferences':
                setStep('lifestyle');
                break;
            case 'photos':
                setStep('partnerPreferences');
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

            // Normalize phone number to E.164 format
            const phoneDigits = phoneNumber.replace(/\D/g, '');
            const normalizedPhone = phoneDigits.length >= 10 ? `+${phoneDigits}` : undefined;

            await updateProfile({
                fullName: fullName.trim(),
                displayName: fullName.trim(),
                profileFor,
                age,
                dateOfBirth: dob,
                gender: gender || undefined,
                preferredGender: preferredGender || undefined,
                phoneNumber: normalizedPhone,
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
                physicalStatus: physicalStatus || undefined,
                religion: religion.trim(),
                sect: sect.trim(),
                caste: caste.trim(),
                motherTongue: motherTongue.trim(),
                ethnicity: ethnicity.trim() || undefined,
                diet: diet || undefined,
                smoking: smoking || undefined,
                drinking: drinking || undefined,
                partnerPreferenceAgeMin: parseInt(partnerPreferenceAgeMin) || undefined,
                partnerPreferenceAgeMax: parseInt(partnerPreferenceAgeMax) || undefined,
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
            'lifestyle',
            'partnerPreferences',
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
                        <Text style={styles.stepEmoji}>💝</Text>
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
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.optionEmojiContainer}>
                                        <Text style={styles.optionEmoji}>
                                            {option === 'self' ? '👤' : option === 'friend' ? '🤝' : '👨‍👩‍👧‍👦'}
                                        </Text>
                                    </View>
                                    <Text style={[
                                        styles.optionText,
                                        profileFor === option && styles.optionTextSelected
                                    ]}>
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Text>
                                    {profileFor === option && (
                                        <View style={styles.checkmarkContainer}>
                                            <Text style={styles.checkmark}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'basicInfo':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>✨</Text>
                        <Text style={styles.stepTitle}>Basic Information</Text>
                        <Text style={styles.stepDescription}>
                            Tell us a bit about yourself
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Your full name"
                                    placeholderTextColor={colors.neutral[400]}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Birthday</Text>
                            <View style={styles.dateInputRow}>
                                <View style={styles.dateInputContainer}>
                                    <TextInput
                                        style={[styles.input, styles.dateInput]}
                                        value={birthMonth}
                                        onChangeText={setBirthMonth}
                                        placeholder="MM"
                                        placeholderTextColor={colors.neutral[400]}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.dateInputContainer}>
                                    <TextInput
                                        style={[styles.input, styles.dateInput]}
                                        value={birthDay}
                                        onChangeText={setBirthDay}
                                        placeholder="DD"
                                        placeholderTextColor={colors.neutral[400]}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.dateInputContainer}>
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
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.genderOptions}>
                                {([
                                    { id: 'male', label: 'Man', icon: '♂' },
                                    { id: 'female', label: 'Woman', icon: '♀' }
                                ] as const).map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.genderOption,
                                            gender === g.id && styles.genderOptionSelected
                                        ]}
                                        onPress={() => setGender(g.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.genderIcon}>{g.icon}</Text>
                                        <Text style={[
                                            styles.genderText,
                                            gender === g.id && styles.genderTextSelected
                                        ]}>{g.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Interested In</Text>
                            <View style={styles.genderOptions}>
                                {(['male', 'female', 'both'] as const).map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.genderOption,
                                            preferredGender === g && styles.genderOptionSelected
                                        ]}
                                        onPress={() => setPreferredGender(g)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[
                                            styles.genderText,
                                            preferredGender === g && styles.genderTextSelected
                                        ]}>
                                            {g === 'male' ? 'Men' : g === 'female' ? 'Women' : 'Everyone'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="+1 234 567 8900"
                                    placeholderTextColor={colors.neutral[400]}
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
                                />
                            </View>
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

                        <Text style={styles.label}>Physical Status (Optional)</Text>
                        <View style={styles.optionsGrid}>
                            {[
                                { value: 'normal', label: 'Normal' },
                                { value: 'differently-abled', label: 'Differently Abled' }
                            ].map((status) => (
                                <TouchableOpacity
                                    key={status.value}
                                    style={[
                                        styles.optionCardSmall,
                                        physicalStatus === status.value && styles.optionCardSelected
                                    ]}
                                    onPress={() => setPhysicalStatus(status.value as 'normal' | 'differently-abled' | '')}
                                >
                                    <Text style={[
                                        styles.optionTextSmall,
                                        physicalStatus === status.value && styles.optionTextSelected
                                    ]}>{status.label}</Text>
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

                        <Text style={styles.label}>Sect (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={sect}
                            onChangeText={setSect}
                            placeholder="e.g. Sunni, Shia"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Caste (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={caste}
                            onChangeText={setCaste}
                            placeholder="e.g. Brahmin, Jat, Rajput"
                            placeholderTextColor={colors.neutral[400]}
                        />

                        <Text style={styles.label}>Ethnicity (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={ethnicity}
                            onChangeText={setEthnicity}
                            placeholder="e.g. Pashtun, Punjabi, Sindhi"
                            placeholderTextColor={colors.neutral[400]}
                        />
                    </View>
                );

            case 'lifestyle':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Lifestyle</Text>
                        <Text style={styles.stepDescription}>
                            Share your lifestyle preferences
                        </Text>

                        <Text style={styles.label}>Diet (Optional)</Text>
                        <View style={styles.optionsGrid}>
                            {[
                                { value: 'vegetarian', label: 'Vegetarian' },
                                { value: 'non-vegetarian', label: 'Non-Vegetarian' },
                                { value: 'vegan', label: 'Vegan' },
                                { value: 'halal', label: 'Halal' }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.optionCardSmall,
                                        diet === option.value && styles.optionCardSelected
                                    ]}
                                    onPress={() => setDiet(option.value as 'vegetarian' | 'non-vegetarian' | 'vegan' | 'halal' | 'other' | '')}
                                >
                                    <Text style={[
                                        styles.optionTextSmall,
                                        diet === option.value && styles.optionTextSelected
                                    ]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Smoking (Optional)</Text>
                        <View style={styles.optionsGrid}>
                            {['no', 'occasionally', 'yes'].map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.optionCardSmall,
                                        smoking === option && styles.optionCardSelected
                                    ]}
                                    onPress={() => setSmoking(option as 'no' | 'occasionally' | 'yes' | '')}
                                >
                                    <Text style={[
                                        styles.optionTextSmall,
                                        smoking === option && styles.optionTextSelected
                                    ]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Drinking (Optional)</Text>
                        <View style={styles.optionsGrid}>
                            {['no', 'occasionally', 'yes'].map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.optionCardSmall,
                                        drinking === option && styles.optionCardSelected
                                    ]}
                                    onPress={() => setDrinking(option as 'no' | 'occasionally' | 'yes' | '')}
                                >
                                    <Text style={[
                                        styles.optionTextSmall,
                                        drinking === option && styles.optionTextSelected
                                    ]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'partnerPreferences':
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Partner Preferences</Text>
                        <Text style={styles.stepDescription}>
                            Help us find your ideal matches
                        </Text>

                        <Text style={styles.label}>Preferred Age Range</Text>
                        <View style={styles.ageRangeContainer}>
                            <View style={styles.ageInput}>
                                <Text style={styles.ageLabel}>Min</Text>
                                <TextInput
                                    style={styles.ageInputField}
                                    value={partnerPreferenceAgeMin}
                                    onChangeText={setPartnerPreferenceAgeMin}
                                    placeholder="18"
                                    placeholderTextColor={colors.neutral[400]}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                            <Text style={styles.ageSeparator}>to</Text>
                            <View style={styles.ageInput}>
                                <Text style={styles.ageLabel}>Max</Text>
                                <TextInput
                                    style={styles.ageInputField}
                                    value={partnerPreferenceAgeMax}
                                    onChangeText={setPartnerPreferenceAgeMax}
                                    placeholder="99"
                                    placeholderTextColor={colors.neutral[400]}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>
                        </View>
                        <Text style={styles.hint}>We'll find matches within this age range</Text>
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
                        <LinearGradient
                            colors={['#FDF2F8', '#FCE7F3', '#FBCFE8']}
                            style={styles.completeGradient}
                        >
                            <View style={styles.completeEmojiContainer}>
                                <Text style={styles.completeEmoji}>🎉</Text>
                            </View>
                            <Text style={styles.completeTitle}>You're all set!</Text>
                            <Text style={styles.completeDescription}>
                                Your profile is ready. Start exploring matches!
                            </Text>
                            <View style={styles.confettiContainer}>
                                <Text style={styles.confetti}>🌸</Text>
                                <Text style={styles.confetti}>💕</Text>
                                <Text style={styles.confetti}>✨</Text>
                            </View>
                        </LinearGradient>
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
            <LinearGradient
                colors={['#FDF2F8', '#FFF5F5', '#F0F7FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Enhanced Progress Header */}
                    <View style={styles.progressHeader}>
                        <View style={styles.stepIndicator}>
                            <Text style={styles.stepNumber}>{stepIndex + 1}</Text>
                            <Text style={styles.stepDivider}>/</Text>
                            <Text style={styles.stepTotal}>10</Text>
                        </View>
                        <View style={styles.progressTrackContainer}>
                            <View style={styles.progressTrackGradient}>
                                <Animated.View
                                    style={[
                                        styles.progressFillGradient,
                                        { width: progressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                        }) }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['#EC4899', '#8B5CF6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.progressGradientInner}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </View>

                    {/* Back button */}
                    {step !== 'profileFor' && (
                        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                            <View style={styles.backButtonInner}>
                                <Text style={styles.backButtonText}>←</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Animated Step Content */}
                    <Animated.View
                        style={[
                            styles.animatedContent,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {renderStepContent()}
                    </Animated.View>

                    {/* Continue Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                            onPress={nextStep}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#EC4899', '#DB2777']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.continueButtonGradient, isLoading && styles.buttonDisabled]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.continueButtonText}>
                                        {step === 'bio' ? 'Complete Profile' : 'Continue'}
                                        <Text style={styles.continueArrow}> →</Text>
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Container
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    gradientBackground: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: moderateScale(20),
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(32),
    },

    // Enhanced Progress Header
    progressHeader: {
        marginBottom: moderateScale(28),
        alignItems: 'center',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(12),
    },
    stepNumber: {
        fontSize: moderateScale(32),
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
        letterSpacing: -1,
    },
    stepDivider: {
        fontSize: moderateScale(20),
        color: colors.neutral[400],
        marginHorizontal: moderateScale(4),
    },
    stepTotal: {
        fontSize: moderateScale(18),
        fontWeight: fontWeight.semibold,
        color: colors.neutral[400],
    },
    progressTrackContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressTrackGradient: {
        width: '100%',
        height: moderateScale(8),
        backgroundColor: colors.neutral[100],
        borderRadius: moderateScale(4),
        overflow: 'hidden',
    },
    progressFillGradient: {
        height: '100%',
        borderRadius: moderateScale(4),
        overflow: 'hidden',
    },
    progressGradientInner: {
        width: '100%',
        height: '100%',
    },

    // Back Button
    backButton: {
        marginBottom: moderateScale(20),
        alignSelf: 'flex-start',
    },
    backButtonInner: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: moderateScale(20),
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.bold,
    },

    // Animated Content
    animatedContent: {
        width: '100%',
    },

    // Step Content
    stepContent: {
        width: '100%',
    },
    stepEmoji: {
        fontSize: moderateScale(48),
        textAlign: 'center',
        marginBottom: moderateScale(16),
    },
    stepTitle: {
        fontSize: responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(8),
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    stepDescription: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        marginBottom: moderateScale(32),
        textAlign: 'center',
        lineHeight: moderateScale(22),
    },

    // Input Groups
    inputGroup: {
        marginBottom: moderateScale(20),
    },
    label: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[700],
        marginBottom: moderateScale(10),
        marginLeft: moderateScale(4),
    },
    inputContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(16),
        padding: moderateScale(18),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        borderWidth: 1.5,
        borderColor: colors.neutral[100],
    },

    // Options Grid
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(14),
        justifyContent: 'center',
    },
    optionCard: {
        width: Dimensions.get('window').width * 0.28,
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(20),
        padding: moderateScale(18),
        paddingVertical: moderateScale(24),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[150],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    optionCardSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: '#FDF2F8',
        shadowColor: colors.primary.DEFAULT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    optionEmojiContainer: {
        marginBottom: moderateScale(8),
    },
    optionEmoji: {
        fontSize: moderateScale(36),
    },
    optionText: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[600],
    },
    optionTextSelected: {
        color: colors.primary.DEFAULT,
    },
    optionTextSmall: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[600],
    },
    checkmarkContainer: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        width: moderateScale(20),
        height: moderateScale(20),
        borderRadius: moderateScale(10),
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: moderateScale(12),
        fontWeight: fontWeight.bold,
    },

    // Date Inputs
    dateInputRow: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    dateInputContainer: {
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    dateInput: {
        textAlign: 'center',
        fontWeight: fontWeight.semibold,
    },
    yearInput: {
        flex: 1.5,
        textAlign: 'center',
        fontWeight: fontWeight.semibold,
    },

    // Gender Options
    genderOptions: {
        flexDirection: 'row',
        gap: moderateScale(12),
    },
    genderOption: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(16),
        paddingVertical: moderateScale(18),
        paddingHorizontal: moderateScale(12),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[150],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    genderOptionSelected: {
        borderColor: colors.primary.DEFAULT,
        backgroundColor: '#FDF2F8',
    },
    genderIcon: {
        fontSize: moderateScale(24),
        marginBottom: moderateScale(6),
    },
    genderText: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[600],
    },
    genderTextSelected: {
        color: colors.primary.DEFAULT,
    },

    // Photo Grid
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    photoWrapper: {
        width: (Dimensions.get('window').width - moderateScale(40 - 24)) / 3,
        aspectRatio: 1,
        borderRadius: moderateScale(16),
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    removePhoto: {
        position: 'absolute',
        top: moderateScale(6),
        right: moderateScale(6),
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: moderateScale(26),
        height: moderateScale(26),
        borderRadius: moderateScale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: '#FFF',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    addPhotoCard: {
        width: (Dimensions.get('window').width - moderateScale(40 - 24)) / 3,
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(16),
        borderWidth: 2.5,
        borderColor: colors.primary[300],
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPhotoIcon: {
        fontSize: moderateScale(32),
        color: colors.primary.DEFAULT,
    },
    addPhotoText: {
        fontSize: moderateScale(10),
        color: colors.primary.DEFAULT,
        marginTop: moderateScale(4),
        fontWeight: fontWeight.semibold,
    },

    // Bio Input
    bioInput: {
        minHeight: moderateScale(130),
        paddingTop: moderateScale(16),
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(6),
        marginRight: moderateScale(4),
    },

    // Footer & Button
    footer: {
        marginTop: moderateScale(28),
    },
    continueButton: {
        borderRadius: moderateScale(20),
        overflow: 'hidden',
        shadowColor: colors.primary.DEFAULT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    continueButtonGradient: {
        paddingVertical: moderateScale(18),
        paddingHorizontal: moderateScale(32),
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
        fontWeight: fontWeight.bold,
        letterSpacing: 0.5,
    },
    continueArrow: {
        marginLeft: moderateScale(4),
    },

    // Partner Preferences Age Range
    ageRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(14),
        marginTop: moderateScale(8),
    },
    ageInput: {
        flex: 1,
        alignItems: 'center',
    },
    ageLabel: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginBottom: moderateScale(8),
    },
    ageInputField: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(14),
        padding: moderateScale(16),
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        borderWidth: 1.5,
        borderColor: colors.neutral[100],
        textAlign: 'center',
        minWidth: moderateScale(70),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    ageSeparator: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[400],
        fontWeight: fontWeight.semibold,
    },
    hint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(10),
        textAlign: 'center',
    },

    // Complete State
    completeContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeGradient: {
        width: '100%',
        padding: moderateScale(40),
        alignItems: 'center',
        borderRadius: moderateScale(24),
    },
    completeEmojiContainer: {
        marginBottom: moderateScale(24),
    },
    completeEmoji: {
        fontSize: moderateScale(72),
    },
    completeTitle: {
        fontSize: responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(12),
        textAlign: 'center',
    },
    completeDescription: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
        textAlign: 'center',
        lineHeight: moderateScale(24),
    },
    confettiContainer: {
        flexDirection: 'row',
        marginTop: moderateScale(24),
        gap: moderateScale(16),
    },
    confetti: {
        fontSize: moderateScale(28),
    },
});
