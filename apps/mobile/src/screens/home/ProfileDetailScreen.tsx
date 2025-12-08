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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getProfileById, type UserProfile } from '../../services/api/profile';
import { likeUser, passUser, reportUser, blockUser } from '../../services/api/matches';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileDetailScreenProps {
    userId: string;
    onBack?: () => void;
    onMatch?: () => void;
}

export default function ProfileDetailScreen({
    userId,
    onBack,
    onMatch,
}: ProfileDetailScreenProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    // Load profile
    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getProfileById(userId);

            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.data) {
                setProfile(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Handle like
    const handleLike = useCallback(async () => {
        try {
            const response = await likeUser(userId, false);

            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! 💕",
                    `You and ${profile?.displayName || 'this person'} liked each other!`,
                    [{ text: 'Send Message', onPress: onMatch }]
                );
            } else {
                Alert.alert('Liked!', 'Your interest has been sent.');
            }
            onBack?.();
        } catch (err) {
            Alert.alert('Error', 'Failed to like profile');
        }
    }, [userId, profile?.displayName, onBack, onMatch]);

    // Handle pass
    const handlePass = useCallback(async () => {
        try {
            await passUser(userId);
            onBack?.();
        } catch (err) {
            console.error('Pass failed:', err);
        }
    }, [userId, onBack]);

    // Handle super like
    const handleSuperLike = useCallback(async () => {
        try {
            const response = await likeUser(userId, true);

            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! ⭐",
                    `Your Super Like worked! You matched with ${profile?.displayName || 'this person'}!`,
                    [{ text: 'Send Message', onPress: onMatch }]
                );
            } else {
                Alert.alert('Super Like sent!', 'They\'ll know you really like them.');
            }
            onBack?.();
        } catch (err) {
            Alert.alert('Error', 'Failed to send Super Like');
        }
    }, [userId, profile?.displayName, onBack, onMatch]);

    // Handle report
    const handleReport = useCallback(() => {
        Alert.alert(
            'Report Profile',
            'Why are you reporting this profile?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Inappropriate Content',
                    onPress: () => reportUser(userId, 'inappropriate')
                },
                {
                    text: 'Fake Profile',
                    onPress: () => reportUser(userId, 'fake')
                },
                {
                    text: 'Other',
                    onPress: () => reportUser(userId, 'other')
                },
            ]
        );
    }, [userId]);

    // Handle block
    const handleBlock = useCallback(() => {
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${profile?.displayName || 'this user'}? They won't be able to see you or contact you.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        await blockUser(userId);
                        onBack?.();
                    }
                },
            ]
        );
    }, [userId, profile?.displayName, onBack]);

    // Get photos array
    const photos = profile?.photos || (profile?.photoURL ? [profile.photoURL] : []);

    // Navigate photos
    const nextPhoto = useCallback(() => {
        if (currentPhotoIndex < photos.length - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
        }
    }, [currentPhotoIndex, photos.length]);

    const prevPhoto = useCallback(() => {
        if (currentPhotoIndex > 0) {
            setCurrentPhotoIndex(prev => prev - 1);
        }
    }, [currentPhotoIndex]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                </View>
                <LoadingSpinner message="Loading profile..." />
            </SafeAreaView>
        );
    }

    if (error || !profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                </View>
                <EmptyState
                    emoji="😕"
                    title="Profile Not Found"
                    message={error || 'This profile is no longer available'}
                    actionLabel="Go Back"
                    onAction={onBack}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Photo Gallery */}
                <View style={styles.photoContainer}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.floatingBack}
                        onPress={onBack}
                    >
                        <Text style={styles.floatingBackIcon}>←</Text>
                    </TouchableOpacity>

                    {/* More Options */}
                    <TouchableOpacity
                        style={styles.floatingMore}
                        onPress={() => Alert.alert(
                            'Options',
                            '',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Report', onPress: handleReport },
                                { text: 'Block', style: 'destructive', onPress: handleBlock },
                            ]
                        )}
                    >
                        <Text style={styles.floatingMoreIcon}>⋮</Text>
                    </TouchableOpacity>

                    {/* Photo */}
                    {photos.length > 0 ? (
                        <>
                            <Image
                                source={{ uri: photos[currentPhotoIndex] }}
                                style={styles.photo}
                                contentFit="cover"
                            />

                            {/* Photo navigation */}
                            <TouchableOpacity
                                style={styles.photoPrev}
                                onPress={prevPhoto}
                            />
                            <TouchableOpacity
                                style={styles.photoNext}
                                onPress={nextPhoto}
                            />

                            {/* Photo indicators */}
                            {photos.length > 1 && (
                                <View style={styles.photoIndicators}>
                                    {photos.map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.photoIndicator,
                                                index === currentPhotoIndex && styles.photoIndicatorActive
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.noPhoto}>
                            <Text style={styles.noPhotoEmoji}>👤</Text>
                        </View>
                    )}

                    {/* Gradient */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.gradient}
                    />

                    {/* Basic Info Overlay */}
                    <View style={styles.basicInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name}>
                                {profile.displayName || 'Unknown'}
                                {profile.age ? `, ${profile.age}` : ''}
                            </Text>
                            {profile.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedIcon}>✓</Text>
                                </View>
                            )}
                        </View>
                        {profile.location?.city && (
                            <Text style={styles.location}>
                                📍 {profile.location.city}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Profile Details */}
                <View style={styles.details}>
                    {/* Bio */}
                    {profile.bio && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About</Text>
                            <Text style={styles.bioText}>{profile.bio}</Text>
                        </View>
                    )}

                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Interests</Text>
                            <View style={styles.interestsList}>
                                {profile.interests.map((interest, index) => (
                                    <View key={index} style={styles.interestTag}>
                                        <Text style={styles.interestText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Last Active */}
                    {profile.lastActive && (
                        <View style={styles.section}>
                            <Text style={styles.lastActive}>
                                Active {new Date(profile.lastActive).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.passButton]}
                    onPress={handlePass}
                >
                    <Text style={styles.passIcon}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.superLikeButton]}
                    onPress={handleSuperLike}
                >
                    <Text style={styles.superLikeIcon}>⭐</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton]}
                    onPress={handleLike}
                >
                    <Text style={styles.likeIcon}>♥</Text>
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
    },
    backButton: {
        padding: spacing[2],
    },
    backIcon: {
        fontSize: 24,
        color: colors.neutral[800],
    },
    scrollView: {
        flex: 1,
    },
    photoContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.25,
        position: 'relative',
    },
    floatingBack: {
        position: 'absolute',
        top: spacing[6],
        left: spacing[4],
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingBackIcon: {
        fontSize: 20,
        color: colors.neutral[800],
    },
    floatingMore: {
        position: 'absolute',
        top: spacing[6],
        right: spacing[4],
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingMoreIcon: {
        fontSize: 20,
        color: colors.neutral[800],
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPrev: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '30%',
    },
    photoNext: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '70%',
    },
    photoIndicators: {
        position: 'absolute',
        top: spacing[3],
        left: spacing[4],
        right: spacing[4],
        flexDirection: 'row',
        gap: spacing[1],
    },
    photoIndicator: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 2,
    },
    photoIndicatorActive: {
        backgroundColor: '#FFFFFF',
    },
    noPhoto: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    noPhotoEmoji: {
        fontSize: 80,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
    },
    basicInfo: {
        position: 'absolute',
        left: spacing[4],
        right: spacing[4],
        bottom: spacing[4],
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
    },
    verifiedBadge: {
        marginLeft: spacing[2],
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.info,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedIcon: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    location: {
        fontSize: fontSize.base,
        color: 'rgba(255,255,255,0.9)',
        marginTop: spacing[1],
    },
    details: {
        padding: spacing[4],
    },
    section: {
        marginBottom: spacing[6],
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
        marginBottom: spacing[2],
    },
    bioText: {
        fontSize: fontSize.base,
        color: colors.neutral[600],
        lineHeight: fontSize.base * 1.6,
    },
    interestsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing[2],
    },
    interestTag: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        borderRadius: borderRadius.full,
    },
    interestText: {
        fontSize: fontSize.sm,
        color: colors.primary.DEFAULT,
    },
    lastActive: {
        fontSize: fontSize.sm,
        color: colors.neutral[400],
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing[4],
        paddingBottom: spacing[6],
        gap: spacing[4],
        backgroundColor: colors.background.light,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    actionButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    passButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: colors.error,
    },
    passIcon: {
        fontSize: 28,
        color: colors.error,
        fontWeight: '700',
    },
    superLikeButton: {
        backgroundColor: colors.info,
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    superLikeIcon: {
        fontSize: 24,
        color: '#FFFFFF',
    },
    likeButton: {
        backgroundColor: colors.success,
    },
    likeIcon: {
        fontSize: 32,
        color: '#FFFFFF',
    },
});
