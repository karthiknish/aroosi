/**
 * Profile Detail Screen - View another user's profile
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import {
    colors,
    spacing,
    fontSize,
    fontWeight,
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
} from '@/theme';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ReportUserModal } from '@/components/ReportUserModal';
import { getProfileById, type UserProfile } from '@/services/api/profile';
import { likeUser, passUser } from '@/services/api/matches';
import { isUserShortlisted, toggleShortlist } from '@/services/api/engagement';
import { useAsyncAction, useAsyncActions } from '@/hooks/useAsyncAction';
import { useOffline } from '@/hooks/useOffline';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.min(SCREEN_WIDTH * 1.25, SCREEN_HEIGHT * 0.6);
const ACTION_BUTTON_SIZE = isSmallDevice ? 52 : 64;
const SUPER_LIKE_SIZE = isSmallDevice ? 44 : 56;

export default function ProfileDetailScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isShortlisted, setIsShortlisted] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const { checkNetworkOrAlert } = useOffline();

    // Load profile
    const loadAction = useAsyncAction(async () => {
        const [profileRes, shortlisted] = await Promise.all([
            getProfileById(userId),
            isUserShortlisted(userId),
        ]);

        if (profileRes.error) throw new Error(profileRes.error);
        if (profileRes.data) setProfile(profileRes.data);
        setIsShortlisted(shortlisted);

        return profileRes.data;
    }, { errorMode: 'alert' });

    const actions = useAsyncActions({
        like: async () => {
            const response = await likeUser(userId, false);
            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! 💕",
                    `You and ${profile?.displayName || 'this person'} liked each other!`,
                    [
                        { text: 'Keep Browsing', style: 'default' },
                        {
                            text: 'Say Hello',
                            onPress: () => {
                                const params = new URLSearchParams({
                                    matchId: response.data?.matchId || userId,
                                    recipientName: profile?.displayName || 'Match',
                                });
                                if (profile?.photoURL) {
                                    params.append('recipientPhoto', profile.photoURL);
                                }
                                router.push(`/chat?${params.toString()}`);
                            }
                        },
                    ]
                );
            }
            router.back();
            return response.data;
        },
        superLike: async () => {
            const response = await likeUser(userId, true);
            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! ⭐",
                    `Your Super Like worked! You matched with ${profile?.displayName || 'this person'}!`,
                    [
                        { text: 'Keep Browsing', style: 'default' },
                        {
                            text: 'Say Hello',
                            onPress: () => {
                                const params = new URLSearchParams({
                                    matchId: response.data?.matchId || userId,
                                    recipientName: profile?.displayName || 'Match',
                                });
                                if (profile?.photoURL) {
                                    params.append('recipientPhoto', profile.photoURL);
                                }
                                router.push(`/chat?${params.toString()}`);
                            }
                        },
                    ]
                );
            }
            router.back();
            return response.data;
        },
        pass: async () => {
            await passUser(userId);
            router.back();
        },
        shortlist: async () => {
            const result = await toggleShortlist(userId);
            if (result.data?.added) {
                setIsShortlisted(true);
            } else if (result.data?.removed) {
                setIsShortlisted(false);
            }
            return result;
        },
    }, { errorMode: 'silent', networkAware: true });

    useEffect(() => {
        loadAction.execute();
    }, [userId]);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleReport = useCallback(() => {
        setShowReportModal(true);
    }, []);

    const handleNextPhoto = useCallback(() => {
        if (profile?.photos && currentPhotoIndex < profile.photos.length - 1) {
            setCurrentPhotoIndex(currentPhotoIndex + 1);
        }
    }, [profile?.photos, currentPhotoIndex]);

    const handlePrevPhoto = useCallback(() => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(currentPhotoIndex - 1);
        }
    }, [currentPhotoIndex]);

    if (loadAction.loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LoadingSpinner message="Loading profile..." />
            </SafeAreaView>
        );
    }

    if (loadAction.error || !profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                </View>
                <EmptyState
                    emoji="😕"
                    title="Couldn't load profile"
                    message={loadAction.error || 'Profile not found'}
                    actionLabel="Go Back"
                    onAction={handleBack}
                />
            </SafeAreaView>
        );
    }

    const currentPhoto = profile.photos?.[currentPhotoIndex] || profile.photoURL;
    const totalPhotos = (profile.photos?.length || 0) + (profile.photoURL ? 1 : 0);

    return (
        <SafeAreaView style={styles.container}>
            <ReportUserModal
                visible={showReportModal}
                userId={userId}
                userName={profile.displayName || 'User'}
                onClose={() => setShowReportModal(false)}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerName}>{profile.displayName}</Text>
                <TouchableOpacity onPress={handleReport} style={styles.reportButton}>
                    <Text style={styles.reportIcon}>⋯</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentInsetAdjustmentBehavior="automatic">
                {/* Photo Section */}
                <View style={styles.photoContainer}>
                    <TouchableOpacity activeOpacity={1} style={styles.photoTouchable}>
                        {currentPhoto ? (
                            <Image source={{ uri: currentPhoto }} style={styles.photo} contentFit="cover" />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Text style={styles.photoPlaceholderText}>
                                    {profile.displayName?.charAt(0) || '?'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Photo Navigation */}
                    {totalPhotos > 1 && (
                        <>
                            {currentPhotoIndex > 0 && (
                                <TouchableOpacity
                                    style={[styles.photoNavButton, styles.photoNavPrev]}
                                    onPress={handlePrevPhoto}
                                >
                                    <Text style={styles.photoNavText}>‹</Text>
                                </TouchableOpacity>
                            )}
                            {currentPhotoIndex < totalPhotos - 1 && (
                                <TouchableOpacity
                                    style={[styles.photoNavButton, styles.photoNavNext]}
                                    onPress={handleNextPhoto}
                                >
                                    <Text style={styles.photoNavText}>›</Text>
                                </TouchableOpacity>
                            )}
                            <View style={styles.photoIndicator}>
                                <Text style={styles.photoIndicatorText}>
                                    {currentPhotoIndex + 1} / {totalPhotos}
                                </Text>
                            </View>
                        </>
                    )}

                    {/* Shortlist Button */}
                    <TouchableOpacity
                        style={styles.shortlistButton}
                        onPress={() => actions.execute.shortlist()}
                        disabled={actions.loading.shortlist}
                    >
                        <Text style={styles.shortlistIcon}>
                            {isShortlisted ? '⭐' : '☆'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.name}>
                        {profile.displayName}
                        {profile.age ? `, ${profile.age}` : ''}
                    </Text>

                    {profile.location?.city && (
                        <Text style={styles.location}>
                            📍 {profile.location.city}
                            {profile.location.state ? `, ${profile.location.state}` : ''}
                        </Text>
                    )}

                    {profile.bio && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.bio}>{profile.bio}</Text>
                        </View>
                    )}

                    {/* Details */}
                    {(profile.education || profile.occupation || profile.height || profile.religion) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            {profile.education && (
                                <Text style={styles.detail}>🎓 {profile.education}</Text>
                            )}
                            {profile.occupation && (
                                <Text style={styles.detail}>💼 {profile.occupation}</Text>
                            )}
                            {profile.height && (
                                <Text style={styles.detail}>📏 {profile.height} cm</Text>
                            )}
                            {profile.religion && (
                                <Text style={styles.detail}>🙏 {profile.religion}</Text>
                            )}
                        </View>
                    )}

                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Interests</Text>
                            <View style={styles.interestsContainer}>
                                {profile.interests.map((interest, index) => (
                                    <View key={index} style={styles.interestTag}>
                                        <Text style={styles.interestText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.passButton}
                    onPress={() => actions.execute.pass()}
                    disabled={actions.loading.pass}
                >
                    <Text style={styles.passButtonText}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.superLikeButton}
                    onPress={() => actions.execute.superLike()}
                    disabled={actions.loading.superLike}
                >
                    <Text style={styles.superLikeButtonText}>⭐</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => actions.execute.like()}
                    disabled={actions.loading.like}
                >
                    <Text style={styles.likeButtonText}>💖</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
    },
    backButtonText: {
        fontSize: moderateScale(28),
        color: colors.neutral[800],
    },
    headerName: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
        flex: 1,
        textAlign: 'center',
    },
    reportButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[400],
    },
    scrollView: {
        flex: 1,
    },
    photoContainer: {
        position: 'relative',
        height: PHOTO_HEIGHT,
    },
    photoTouchable: {
        width: '100%',
        height: '100%',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.neutral[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPlaceholderText: {
        fontSize: moderateScale(80),
        color: colors.neutral[400],
    },
    photoNavButton: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -25 }],
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoNavPrev: {
        left: moderateScale(16),
    },
    photoNavNext: {
        right: moderateScale(16),
    },
    photoNavText: {
        fontSize: moderateScale(32),
        color: '#FFFFFF',
    },
    photoIndicator: {
        position: 'absolute',
        bottom: moderateScale(16),
        left: '50%',
        transform: [{ translateX: -25 }],
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(4),
        borderRadius: moderateScale(12),
    },
    photoIndicatorText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.medium,
    },
    shortlistButton: {
        position: 'absolute',
        top: moderateScale(16),
        right: moderateScale(16),
        width: moderateScale(44),
        height: moderateScale(44),
        borderRadius: moderateScale(22),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    shortlistIcon: {
        fontSize: moderateScale(24),
    },
    infoContainer: {
        padding: responsiveValues.screenPadding,
    },
    name: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
        marginBottom: moderateScale(4),
    },
    location: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        marginBottom: moderateScale(24),
    },
    section: {
        marginBottom: moderateScale(24),
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: moderateScale(12),
    },
    bio: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[700],
        lineHeight: responsiveFontSizes.base * 1.6,
    },
    detail: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[700],
        marginBottom: moderateScale(8),
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    interestTag: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(6),
        borderRadius: borderRadius.full,
    },
    interestText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.medium,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    passButton: {
        width: ACTION_BUTTON_SIZE,
        height: ACTION_BUTTON_SIZE,
        borderRadius: ACTION_BUTTON_SIZE / 2,
        backgroundColor: colors.neutral[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    passButtonText: {
        fontSize: moderateScale(28),
        color: colors.neutral[500],
    },
    superLikeButton: {
        width: SUPER_LIKE_SIZE,
        height: SUPER_LIKE_SIZE,
        borderRadius: SUPER_LIKE_SIZE / 2,
        backgroundColor: colors.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    superLikeButtonText: {
        fontSize: moderateScale(24),
    },
    likeButton: {
        width: ACTION_BUTTON_SIZE,
        height: ACTION_BUTTON_SIZE,
        borderRadius: ACTION_BUTTON_SIZE / 2,
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    likeButtonText: {
        fontSize: moderateScale(28),
    },
});
