/**
 * SwipeCard Component
 * A swipeable card for displaying profile information in the home/matching screen
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
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
} from '../theme';
import type { RecommendedProfile } from '../services/api/recommendations';

const CARD_WIDTH = SCREEN_WIDTH - (responsiveValues.screenPadding * 2);
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.65, 550);
const ACTION_BUTTON_SIZE = isSmallDevice ? 48 : 56;
const SMALL_BUTTON_SIZE = isSmallDevice ? 40 : 48;

interface SwipeCardProps {
    profile: RecommendedProfile;
    onLike?: () => void;
    onPass?: () => void;
    onSuperLike?: () => void;
    onInfo?: () => void;
}

export function SwipeCard({ profile, onLike, onPass, onSuperLike, onInfo }: SwipeCardProps) {
    const { displayName, photoURL, photos, age, location, bio, interests, isVerified } = profile;

    // Get the main photo
    const mainPhoto = photos?.[0] || photoURL;

    return (
        <View style={styles.card}>
            {/* Profile Image */}
            <View style={styles.imageContainer}>
                {mainPhoto ? (
                    <Image
                        source={{ uri: mainPhoto }}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderEmoji}>👤</Text>
                    </View>
                )}

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Profile Info Overlay */}
                <View style={styles.infoOverlay}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>
                            {displayName || 'Unknown'}
                            {age ? `, ${age}` : ''}
                        </Text>
                        {isVerified && <Text style={styles.verified}>✓</Text>}
                    </View>

                    {location?.city && (
                        <View style={styles.locationRow}>
                            <Text style={styles.locationIcon}>📍</Text>
                            <Text style={styles.location}>
                                {location.city}
                                {location.distance ? ` • ${location.distance} km away` : ''}
                            </Text>
                        </View>
                    )}

                    {bio && (
                        <Text style={styles.bio} numberOfLines={2}>
                            {bio}
                        </Text>
                    )}

                    {interests && interests.length > 0 && (
                        <View style={styles.interestsRow}>
                            {interests.slice(0, 3).map((interest: string, index: number) => (
                                <View key={index} style={styles.interestTag}>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                            {interests.length > 3 && (
                                <Text style={styles.moreInterests}>+{interests.length - 3}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.passButton]}
                    onPress={onPass}
                    activeOpacity={0.8}
                >
                    <Text style={styles.passIcon}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.superLikeButton]}
                    onPress={onSuperLike}
                    activeOpacity={0.8}
                >
                    <Text style={styles.superLikeIcon}>⭐</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton]}
                    onPress={onLike}
                    activeOpacity={0.8}
                >
                    <Text style={styles.likeIcon}>♥</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.infoButton]}
                    onPress={onInfo}
                    activeOpacity={0.8}
                >
                    <Text style={styles.infoIcon}>ℹ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        alignSelf: 'center',
    },
    imageContainer: {
        flex: 1,
        borderRadius: borderRadius['2xl'],
        overflow: 'hidden',
        backgroundColor: colors.neutral[100],
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.neutral[200],
    },
    placeholderEmoji: {
        fontSize: moderateScale(80),
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
    },
    infoOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: responsiveValues.screenPadding,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(4),
        flexWrap: 'wrap',
    },
    name: {
        fontSize: isSmallDevice ? responsiveFontSizes.xl : responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
    },
    verified: {
        marginLeft: moderateScale(8),
        fontSize: responsiveFontSizes.lg,
        color: colors.info,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(8),
    },
    locationIcon: {
        fontSize: responsiveFontSizes.sm,
        marginRight: moderateScale(4),
    },
    location: {
        fontSize: responsiveFontSizes.sm,
        color: 'rgba(255,255,255,0.9)',
    },
    bio: {
        fontSize: responsiveFontSizes.sm,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: moderateScale(8),
    },
    interestsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: moderateScale(4),
    },
    interestTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
    },
    interestText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
    },
    moreInterests: {
        fontSize: responsiveFontSizes.xs,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: moderateScale(4),
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: moderateScale(16),
        gap: isSmallDevice ? moderateScale(8) : moderateScale(12),
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
        fontSize: moderateScale(24),
        color: colors.error,
        fontWeight: '700',
    },
    superLikeButton: {
        backgroundColor: colors.info,
        width: SMALL_BUTTON_SIZE,
        height: SMALL_BUTTON_SIZE,
        borderRadius: SMALL_BUTTON_SIZE / 2,
    },
    superLikeIcon: {
        fontSize: moderateScale(20),
        color: '#FFFFFF',
    },
    likeButton: {
        backgroundColor: colors.success,
    },
    likeIcon: {
        fontSize: moderateScale(28),
        color: '#FFFFFF',
    },
    infoButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: colors.info,
        width: SMALL_BUTTON_SIZE,
        height: SMALL_BUTTON_SIZE,
        borderRadius: SMALL_BUTTON_SIZE / 2,
    },
    infoIcon: {
        fontSize: moderateScale(20),
        color: colors.info,
    },
});
