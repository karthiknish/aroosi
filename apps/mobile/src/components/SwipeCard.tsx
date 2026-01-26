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
import { BlurView } from 'expo-blur';
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
import { getMainProfileImage, getGenderPlaceholder } from '../utils/profileImage';

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
    const { displayName, age, location, bio, interests, isVerified } = profile;
    const gender = (profile as any).gender;

    // Get the main photo
    const mainPhoto = getMainProfileImage(profile as any);
    const genderPlaceholder = getGenderPlaceholder(gender);

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
                        <Text style={styles.placeholderEmoji}>{genderPlaceholder}</Text>
                    </View>
                )}

                {/* BlurView overlay - native iOS blur effect */}
                <BlurView
                    tint="systemUltraThinMaterial"
                    intensity={85}
                    style={styles.blurOverlay}
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
                                <BlurView
                                    key={index}
                                    tint="systemMaterial"
                                    intensity={60}
                                    style={styles.interestTag}
                                >
                                    <Text style={styles.interestText}>{interest}</Text>
                                </BlurView>
                            ))}
                            {interests.length > 3 && (
                                <Text style={styles.moreInterests}>+{interests.length - 3}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Action Buttons with glass effect */}
            <View style={styles.actionButtons}>
                <GlassActionButton
                    icon="✕"
                    color={colors.error}
                    onPress={onPass}
                />

                <GlassActionButton
                    icon="⭐"
                    color={colors.info}
                    onPress={onSuperLike}
                    size={SMALL_BUTTON_SIZE}
                />

                <GlassActionButton
                    icon="♥"
                    color={colors.success}
                    onPress={onLike}
                />

                <GlassActionButton
                    icon="ℹ"
                    color={colors.info}
                    onPress={onInfo}
                    size={SMALL_BUTTON_SIZE}
                    outlined
                />
            </View>
        </View>
    );
}

interface GlassActionButtonProps {
    icon: string;
    color: string;
    onPress?: () => void;
    size?: number;
    outlined?: boolean;
}

function GlassActionButton({ icon, color, onPress, size = ACTION_BUTTON_SIZE, outlined = false }: GlassActionButtonProps) {
    return (
        <BlurView
            tint="systemMaterial"
            intensity={90}
            style={[
                styles.glassActionButton,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}
        >
            <TouchableOpacity
                style={[
                    styles.actionButtonInner,
                    outlined && {
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderColor: color,
                    },
                    !outlined && { backgroundColor: '#FFFFFF' },
                ]}
                onPress={onPress || (() => {})}
                activeOpacity={0.8}
            >
                <Text style={[styles.actionButtonIcon, { color }]}>{icon}</Text>
            </TouchableOpacity>
        </BlurView>
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
    blurOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '55%',
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
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    verified: {
        marginLeft: moderateScale(8),
        fontSize: responsiveFontSizes.lg,
        color: colors.info,
        backgroundColor: 'rgba(255,255,255,0.25)',
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
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    bio: {
        fontSize: responsiveFontSizes.sm,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: moderateScale(8),
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    interestsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: moderateScale(6),
    },
    interestTag: {
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(6),
        borderRadius: borderRadius.full,
    },
    interestText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
        fontWeight: '500',
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
    glassActionButton: {
        overflow: 'hidden',
    },
    actionButtonInner: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: ACTION_BUTTON_SIZE / 2,
    },
    actionButtonIcon: {
        fontWeight: '700',
    },
});
