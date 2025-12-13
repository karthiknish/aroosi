/**
 * Edit Profile Screen - Update profile information
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
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
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
    getProfile,
    updateProfile,
    uploadProfilePhoto,
    deleteProfilePhoto,
    type UserProfile,
    type ProfileUpdateData,
} from '../../services/api/profile';

interface EditProfileScreenProps {
    onBack?: () => void;
    onSave?: () => void;
}

export default function EditProfileScreen({ onBack, onSave }: EditProfileScreenProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [age, setAge] = useState('');
    const [city, setCity] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [newInterest, setNewInterest] = useState('');
    const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);

    // Load profile
    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getProfile();

            if (response.data) {
                const p = response.data;
                setProfile(p);
                setDisplayName(p.displayName || '');
                setBio(p.bio || '');
                setAge(p.age?.toString() || '');
                setCity(p.location?.city || '');
                setInterests(p.interests || []);
                
                // Initialize photos array
                const photoArray: (string | null)[] = [null, null, null, null, null, null];
                p.photos?.forEach((photo, index) => {
                    if (index < 6) photoArray[index] = photo;
                });
                setPhotos(photoArray);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Handle photo selection
    const handlePhotoPress = useCallback((index: number) => {
        const hasPhoto = photos[index] !== null;
        
        const options = hasPhoto 
            ? ['Take Photo', 'Choose from Library', 'Delete Photo', 'Cancel']
            : ['Take Photo', 'Choose from Library', 'Cancel'];
        
        const destructiveIndex = hasPhoto ? 2 : undefined;
        const cancelIndex = hasPhoto ? 3 : 2;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: destructiveIndex,
                    cancelButtonIndex: cancelIndex,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        openCamera(index);
                    } else if (buttonIndex === 1) {
                        openGallery(index);
                    } else if (hasPhoto && buttonIndex === 2) {
                        handleDeletePhoto(index);
                    }
                }
            );
        } else {
            // Android - use simple Alert
            Alert.alert(
                'Photo Options',
                'Choose an option',
                hasPhoto ? [
                    { text: 'Take Photo', onPress: () => openCamera(index) },
                    { text: 'Choose from Library', onPress: () => openGallery(index) },
                    { text: 'Delete Photo', style: 'destructive', onPress: () => handleDeletePhoto(index) },
                    { text: 'Cancel', style: 'cancel' },
                ] : [
                    { text: 'Take Photo', onPress: () => openCamera(index) },
                    { text: 'Choose from Library', onPress: () => openGallery(index) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    }, [photos]);

    // Open camera
    const openCamera = async (index: number) => {
        const result = await launchCamera({
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 1080,
            maxHeight: 1080,
        });
        handleImageResult(result, index);
    };

    // Open gallery
    const openGallery = async (index: number) => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 1080,
            maxHeight: 1080,
        });
        handleImageResult(result, index);
    };

    // Handle image picker result
    const handleImageResult = async (result: ImagePickerResponse, index: number) => {
        if (result.didCancel || result.errorCode || !result.assets?.[0]?.uri) {
            return;
        }

        const imageUri = result.assets[0].uri;
        setUploadingIndex(index);

        try {
            const response = await uploadProfilePhoto(imageUri, index);
            
            if (response.photoUrl) {
                const newPhotos = [...photos];
                newPhotos[index] = response.photoUrl;
                setPhotos(newPhotos);
            } else if (response.error) {
                Alert.alert('Error', response.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to upload photo');
        } finally {
            setUploadingIndex(null);
        }
    };

    // Delete photo
    const handleDeletePhoto = async (index: number) => {
        const photoUrl = photos[index];
        if (!photoUrl) return;

        setUploadingIndex(index);
        try {
            await deleteProfilePhoto(photoUrl);
            const newPhotos = [...photos];
            newPhotos[index] = null;
            setPhotos(newPhotos);
        } catch (error) {
            Alert.alert('Error', 'Failed to delete photo');
        } finally {
            setUploadingIndex(null);
        }
    };

    // Save profile
    const handleSave = useCallback(async () => {
        try {
            setSaving(true);

            const updateData: ProfileUpdateData = {
                displayName: displayName.trim(),
                bio: bio.trim(),
                age: age ? parseInt(age, 10) : undefined,
                location: city ? { city: city.trim() } : undefined,
                interests,
            };

            const response = await updateProfile(updateData);

            if (response.error) {
                Alert.alert('Error', response.error);
                return;
            }

            Alert.alert('Success', 'Profile updated successfully');
            onSave?.();
        } catch (err) {
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    }, [displayName, bio, age, city, interests, onSave]);

    // Add interest
    const addInterest = useCallback(() => {
        const interest = newInterest.trim();
        if (interest && !interests.includes(interest) && interests.length < 10) {
            setInterests(prev => [...prev, interest]);
            setNewInterest('');
        }
    }, [newInterest, interests]);

    // Remove interest
    const removeInterest = useCallback((interest: string) => {
        setInterests(prev => prev.filter(i => i !== interest));
    }, []);


    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={styles.headerRight} />
                </View>
                <LoadingSpinner message="Loading profile..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveText}>
                        {saving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Photos Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    <View style={styles.photosGrid}>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.photoSlot}
                                onPress={() => handlePhotoPress(index)}
                                disabled={uploadingIndex !== null}
                            >
                                {uploadingIndex === index ? (
                                    <View style={styles.photoPlaceholder}>
                                        <ActivityIndicator color={colors.primary.DEFAULT} />
                                    </View>
                                ) : photos[index] ? (
                                    <Image
                                        source={{ uri: photos[index]! }}
                                        style={styles.photo}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Text style={styles.addPhotoIcon}>+</Text>
                                    </View>
                                )}
                                {index === 0 && photos[index] && (
                                    <View style={styles.mainPhotoBadge}>
                                        <Text style={styles.mainPhotoText}>Main</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.photoHint}>
                        Add up to 6 photos. First photo is your main profile picture.
                    </Text>
                </View>

                {/* Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Info</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your name"
                            placeholderTextColor={colors.neutral[400]}
                            maxLength={50}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            value={age}
                            onChangeText={setAge}
                            placeholder="Your age"
                            placeholderTextColor={colors.neutral[400]}
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder="Where you live"
                            placeholderTextColor={colors.neutral[400]}
                            maxLength={100}
                        />
                    </View>
                </View>

                {/* About Me */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell others about yourself..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{bio.length}/500</Text>
                    </View>
                </View>

                {/* Interests */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Interests</Text>

                    <View style={styles.interestsList}>
                        {interests.map((interest, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.interestTag}
                                onPress={() => removeInterest(interest)}
                            >
                                <Text style={styles.interestText}>{interest}</Text>
                                <Text style={styles.removeInterest}>✕</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {interests.length < 10 && (
                        <View style={styles.addInterestRow}>
                            <TextInput
                                style={[styles.input, styles.interestInput]}
                                value={newInterest}
                                onChangeText={setNewInterest}
                                placeholder="Add an interest..."
                                placeholderTextColor={colors.neutral[400]}
                                maxLength={30}
                                onSubmitEditing={addInterest}
                            />
                            <TouchableOpacity
                                style={styles.addInterestButton}
                                onPress={addInterest}
                            >
                                <Text style={styles.addInterestText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <Text style={styles.interestHint}>
                        Add up to 10 interests. Tap to remove.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        backgroundColor: colors.background.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        padding: moderateScale(8),
    },
    backIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[800],
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerRight: {
        width: moderateScale(60),
    },
    saveButton: {
        padding: moderateScale(8),
    },
    saveText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: moderateScale(32),
    },
    section: {
        backgroundColor: colors.background.light,
        marginBottom: responsiveValues.itemSpacing,
        padding: responsiveValues.cardPadding,
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        marginBottom: moderateScale(16),
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    photoSlot: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.neutral[200],
        borderStyle: 'dashed',
        borderRadius: borderRadius.lg,
    },
    addPhotoIcon: {
        fontSize: moderateScale(32),
        color: colors.neutral[400],
    },
    photoHint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(12),
    },
    inputGroup: {
        marginBottom: moderateScale(16),
    },
    label: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
        color: colors.neutral[600],
        marginBottom: moderateScale(8),
    },
    input: {
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(12),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
    },
    textArea: {
        minHeight: moderateScale(100),
        paddingTop: moderateScale(12),
    },
    charCount: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        textAlign: 'right',
        marginTop: moderateScale(4),
    },
    interestsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
        marginBottom: moderateScale(12),
    },
    interestTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary[100],
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(8),
        borderRadius: borderRadius.full,
        gap: moderateScale(8),
    },
    interestText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.primary.DEFAULT,
    },
    removeInterest: {
        fontSize: responsiveFontSizes.xs,
        color: colors.primary.DEFAULT,
    },
    addInterestRow: {
        flexDirection: 'row',
        gap: moderateScale(8),
    },
    interestInput: {
        flex: 1,
    },
    addInterestButton: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(16),
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
        minHeight: moderateScale(44),
    },
    addInterestText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
    interestHint: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(8),
    },
    mainPhotoBadge: {
        position: 'absolute',
        bottom: moderateScale(4),
        left: moderateScale(4),
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(6),
        paddingVertical: moderateScale(2),
        borderRadius: borderRadius.sm,
    },
    mainPhotoText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
        fontWeight: fontWeight.medium,
    },
});
