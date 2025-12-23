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
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
    scaleWidth,
} from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { ReportUserModal } from '../../components/ReportUserModal';
import { getProfileById, type UserProfile } from '../../services/api/profile';
import { likeUser, passUser, blockUser } from '../../services/api/matches';
import { isUserShortlisted, toggleShortlist } from '../../services/api/engagement';
import { sendInterest, checkInterestStatus } from '../../services/api/interests';
import { getUserIcebreakerAnswers, type IcebreakerAnswer } from '../../services/api/icebreakers';

// Responsive photo height
const PHOTO_HEIGHT = Math.min(SCREEN_WIDTH * 1.25, SCREEN_HEIGHT * 0.6);
const ACTION_BUTTON_SIZE = isSmallDevice ? 52 : 64;
const SUPER_LIKE_SIZE = isSmallDevice ? 44 : 56;

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
    
    // Engagement state
    const [isShortlisted, setIsShortlisted] = useState(false);
    const [interestStatus, setInterestStatus] = useState<'none' | 'pending' | 'accepted' | 'declined'>('none');
    const [icebreakerAnswers, setIcebreakerAnswers] = useState<IcebreakerAnswer[]>([]);
    const [shortlistLoading, setShortlistLoading] = useState(false);
    const [interestLoading, setInterestLoading] = useState(false);
    
    // Report modal state
    const [showReportModal, setShowReportModal] = useState(false);

    // Load profile and engagement data
    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [profileRes, interestRes, icebreakerRes, shortlistRes] = await Promise.all([
                getProfileById(userId),
                checkInterestStatus(userId),
                getUserIcebreakerAnswers(userId),
                isUserShortlisted(userId), // Fetch shortlist status here
            ]);
            
            if (profileRes.error) {
                setError(profileRes.error);
            } else if (profileRes.data) {
                setProfile(profileRes.data);
            }
            
            if (interestRes.data) {
                const status = interestRes.data.status;
                // Map status to our local type, treating expired as none
                if (status === 'pending' || status === 'accepted' || status === 'declined') {
                    setInterestStatus(status);
                } else {
                    setInterestStatus('none');
                }
            }
            
            if (icebreakerRes.data) {
                setIcebreakerAnswers(icebreakerRes.data);
            }

            // Set shortlist status - shortlistRes is a boolean
            setIsShortlisted(shortlistRes);
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
            Alert.alert('Error', 'Failed to pass user');
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

    // Handle report - opens the report modal
    const handleReport = useCallback(() => {
        setShowReportModal(true);
    }, []);

    // Handle report submitted
    const handleReportSubmitted = useCallback(() => {
        // Go back after reporting
        onBack?.();
    }, [onBack]);

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
                        try {
                            await blockUser(userId);
                            onBack?.();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to block user');
                        }
                    }
                },
            ]
        );
    }, [userId, profile?.displayName, onBack]);

    // Handle shortlist toggle
    const handleShortlist = useCallback(async () => {
        try {
            setShortlistLoading(true);
            await toggleShortlist(userId);
            setIsShortlisted(prev => !prev);
            Alert.alert(
                isShortlisted ? 'Removed' : 'Added to Shortlist',
                isShortlisted 
                    ? 'Profile removed from your shortlist.' 
                    : 'Profile added to your shortlist! You can add notes in the Shortlists screen.'
            );
        } catch (err) {
            Alert.alert('Error', 'Failed to update shortlist');
        } finally {
            setShortlistLoading(false);
        }
    }, [userId, isShortlisted]);

    // Handle send interest
    const handleSendInterest = useCallback(async () => {
        if (interestStatus !== 'none') {
            Alert.alert('Already Sent', 'You have already sent interest to this person.');
            return;
        }
        
        try {
            setInterestLoading(true);
            const response = await sendInterest(userId);
            if (response.data?.success) {
                setInterestStatus('pending');
                Alert.alert('Interest Sent! 💌', 'Your interest has been sent. You\'ll be notified when they respond.');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to send interest');
        } finally {
            setInterestLoading(false);
        }
    }, [userId, interestStatus]);

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
                            {profile.isMutualInterest && (
                                <View style={styles.matchBadge}>
                                    <Text style={styles.matchBadgeText}>Mutual Match</Text>
                                </View>
                            )}
                        </View>
                        {profile.isBlocked && (
                            <View style={styles.blockedBadge}>
                                <Text style={styles.blockedBadgeText}>You have blocked this user</Text>
                            </View>
                        )}
                        {profile.location?.city && (
                            <Text style={styles.location}>
                                📍 {profile.location.city}
                            </Text>
                        )}
                        {profile.occupation && (
                            <Text style={styles.location}>
                                💼 {profile.occupation}
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

                    {/* Key Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <View style={styles.detailsGrid}>
                            {profile.maritalStatus && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Marital Status</Text>
                                    <Text style={styles.detailValue}>{profile.maritalStatus}</Text>
                                </View>
                            )}
                            {profile.religion && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Religion</Text>
                                    <Text style={styles.detailValue}>{profile.religion}{profile.sect ? ` (${profile.sect})` : ''}</Text>
                                </View>
                            )}
                            {profile.motherTongue && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Mother Tongue</Text>
                                    <Text style={styles.detailValue}>{profile.motherTongue}</Text>
                                </View>
                            )}
                            {profile.height && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Height</Text>
                                    <Text style={styles.detailValue}>{profile.height}</Text>
                                </View>
                            )}
                            {profile.education && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Education</Text>
                                    <Text style={styles.detailValue}>{profile.education}</Text>
                                </View>
                            )}
                            {profile.occupation && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Occupation</Text>
                                    <Text style={styles.detailValue}>{profile.occupation}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Interests</Text>
                            <View style={styles.interestsList}>
                                {profile.interests.map((interest: string, index: number) => (
                                    <View key={index} style={styles.interestTag}>
                                        <Text style={styles.interestText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Icebreaker Answers */}
                    {icebreakerAnswers.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🚀 Icebreakers</Text>
                            {icebreakerAnswers.slice(0, 3).map((answer: IcebreakerAnswer, index: number) => (
                                <View key={index} style={styles.icebreakerCard}>
                                    <Text style={styles.icebreakerQuestion}>{answer.question}</Text>
                                    <Text style={styles.icebreakerAnswer}>{answer.answer}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Engagement Actions */}
                    <View style={styles.engagementActions}>
                        <TouchableOpacity
                            style={[
                                styles.engagementButton,
                                isShortlisted && styles.engagementButtonActive,
                            ]}
                            onPress={handleShortlist}
                            disabled={shortlistLoading}
                        >
                            <Text style={styles.engagementIcon}>
                                {isShortlisted ? '💝' : '💛'}
                            </Text>
                            <Text style={styles.engagementLabel}>
                                {shortlistLoading ? '...' : isShortlisted ? 'Saved' : 'Shortlist'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.engagementButton,
                                interestStatus !== 'none' && styles.engagementButtonActive,
                            ]}
                            onPress={handleSendInterest}
                            disabled={interestLoading || interestStatus !== 'none'}
                        >
                            <Text style={styles.engagementIcon}>💌</Text>
                            <Text style={styles.engagementLabel}>
                                {interestLoading ? '...' : 
                                 interestStatus === 'pending' ? 'Sent' :
                                 interestStatus === 'accepted' ? 'Accepted' :
                                 'Interest'}
                            </Text>
                        </TouchableOpacity>
                    </View>

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
            {!profile.isBlocked && (
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
            )}

            {/* Report User Modal */}
            <ReportUserModal
                visible={showReportModal}
                userId={userId}
                userName={profile.displayName || 'this user'}
                onClose={() => setShowReportModal(false)}
                onReported={handleReportSubmitted}
            />
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
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
    },
    backButton: {
        padding: moderateScale(8),
    },
    backIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[800],
    },
    scrollView: {
        flex: 1,
    },
    photoContainer: {
        width: SCREEN_WIDTH,
        height: PHOTO_HEIGHT,
        position: 'relative',
    },
    floatingBack: {
        position: 'absolute',
        top: moderateScale(24),
        left: responsiveValues.screenPadding,
        zIndex: 10,
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingBackIcon: {
        fontSize: moderateScale(20),
        color: colors.neutral[800],
    },
    floatingMore: {
        position: 'absolute',
        top: moderateScale(24),
        right: responsiveValues.screenPadding,
        zIndex: 10,
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingMoreIcon: {
        fontSize: moderateScale(20),
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
        top: moderateScale(12),
        left: responsiveValues.screenPadding,
        right: responsiveValues.screenPadding,
        flexDirection: 'row',
        gap: moderateScale(4),
    },
    photoIndicator: {
        flex: 1,
        height: moderateScale(3),
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: moderateScale(2),
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
        fontSize: moderateScale(80),
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
        left: responsiveValues.screenPadding,
        right: responsiveValues.screenPadding,
        bottom: responsiveValues.screenPadding,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    name: {
        fontSize: isSmallDevice ? responsiveFontSizes['2xl'] : responsiveFontSizes['3xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
    },
    verifiedBadge: {
        marginLeft: moderateScale(8),
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: moderateScale(12),
        backgroundColor: colors.info,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedIcon: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
        fontWeight: '700',
    },
    matchBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.sm,
        marginLeft: moderateScale(8),
    },
    matchBadgeText: {
        color: '#FFFFFF',
        fontSize: moderateScale(10),
        fontWeight: fontWeight.bold,
        textTransform: 'uppercase',
    },
    blockedBadge: {
        backgroundColor: colors.error,
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.sm,
        marginTop: moderateScale(4),
        alignSelf: 'flex-start',
    },
    blockedBadgeText: {
        color: '#FFFFFF',
        fontSize: moderateScale(10),
        fontWeight: fontWeight.bold,
    },
    location: {
        fontSize: responsiveFontSizes.base,
        color: 'rgba(255,255,255,0.9)',
        marginTop: moderateScale(4),
    },
    details: {
        padding: responsiveValues.screenPadding,
    },
    section: {
        marginBottom: moderateScale(24),
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[800],
        marginBottom: moderateScale(8),
    },
    bioText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[600],
        lineHeight: responsiveFontSizes.base * 1.6,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(12),
    },
    detailItem: {
        width: '47%',
        backgroundColor: colors.neutral[50],
        padding: moderateScale(12),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    detailLabel: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[500],
        marginBottom: moderateScale(4),
        fontWeight: fontWeight.medium,
    },
    detailValue: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[800],
        fontWeight: fontWeight.semibold,
    },
    interestsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: moderateScale(8),
    },
    interestTag: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(8),
        borderRadius: borderRadius.full,
    },
    interestText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.primary.DEFAULT,
    },
    lastActive: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: moderateScale(16),
        paddingBottom: moderateScale(24),
        gap: isSmallDevice ? moderateScale(12) : moderateScale(16),
        backgroundColor: colors.background.light,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    actionButton: {
        width: ACTION_BUTTON_SIZE,
        height: ACTION_BUTTON_SIZE,
        borderRadius: ACTION_BUTTON_SIZE / 2,
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
        fontSize: moderateScale(28),
        color: colors.error,
        fontWeight: '700',
    },
    superLikeButton: {
        backgroundColor: colors.info,
        width: SUPER_LIKE_SIZE,
        height: SUPER_LIKE_SIZE,
        borderRadius: SUPER_LIKE_SIZE / 2,
    },
    superLikeIcon: {
        fontSize: moderateScale(24),
        color: '#FFFFFF',
    },
    likeButton: {
        backgroundColor: colors.success,
    },
    likeIcon: {
        fontSize: moderateScale(32),
        color: '#FFFFFF',
    },
    // Icebreaker styles
    icebreakerCard: {
        backgroundColor: colors.neutral[50],
        borderRadius: borderRadius.xl,
        padding: responsiveValues.cardPadding,
        marginBottom: moderateScale(12),
        borderLeftWidth: 3,
        borderLeftColor: colors.primary.DEFAULT,
    },
    icebreakerQuestion: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        marginBottom: moderateScale(8),
        fontStyle: 'italic',
    },
    icebreakerAnswer: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[800],
        lineHeight: responsiveFontSizes.base * 1.5,
    },
    // Engagement action styles
    engagementActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: isSmallDevice ? moderateScale(8) : moderateScale(16),
        marginVertical: moderateScale(16),
        paddingVertical: moderateScale(12),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    engagementButton: {
        alignItems: 'center',
        paddingVertical: moderateScale(8),
        paddingHorizontal: isSmallDevice ? moderateScale(12) : moderateScale(16),
        borderRadius: borderRadius.xl,
        backgroundColor: colors.neutral[100],
        minWidth: isSmallDevice ? moderateScale(70) : moderateScale(90),
    },
    engagementButtonActive: {
        backgroundColor: colors.primary[100],
    },
    engagementIcon: {
        fontSize: moderateScale(24),
        marginBottom: moderateScale(4),
    },
    engagementLabel: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[600],
        fontWeight: fontWeight.medium,
    },
});
