/**
 * ProfileGridItem Component
 * A grid item for displaying profile previews in the discover/search screen
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
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
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
} from '../theme';
import type { RecommendedProfile } from '../services/api/recommendations';
import { getMainProfileImage, getGenderPlaceholder } from '../utils/profileImage';

// Calculate grid item size based on screen width - 2 columns with padding
const GRID_PADDING = responsiveValues.screenPadding;
const ITEM_GAP = moderateScale(12);
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - ITEM_GAP) / 2;
const ITEM_HEIGHT = ITEM_WIDTH * 1.3;
const BADGE_SIZE = isSmallDevice ? 20 : 24;

interface ProfileGridItemProps {
    profile: RecommendedProfile;
    onPress?: () => void;
}

export function ProfileGridItem({ profile, onPress }: ProfileGridItemProps) {
    const { displayName, age, location, isVerified, compatibility } = profile;
    const gender = (profile as any).gender;

    const mainPhoto = getMainProfileImage(profile as any);
    const genderPlaceholder = getGenderPlaceholder(gender);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.9}
        >
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
                    intensity={80}
                    style={styles.blurOverlay}
                />

                {/* Verified badge with blur background */}
                {isVerified && (
                    <BlurView
                        tint="systemThinMaterial"
                        intensity={90}
                        style={styles.verifiedBadge}
                    >
                        <Text style={styles.verifiedIcon}>✓</Text>
                    </BlurView>
                )}

                {/* Compatibility score with blur background */}
                {compatibility !== undefined && (
                    <BlurView
                        tint="systemThinMaterial"
                        intensity={90}
                        style={styles.compatibilityBadge}
                    >
                        <Text style={styles.compatibilityText}>{compatibility}%</Text>
                    </BlurView>
                )}

                {/* Profile Info Overlay */}
                <View style={styles.infoOverlay}>
                    <Text style={styles.name} numberOfLines={1}>
                        {displayName || 'Unknown'}
                        {age ? `, ${age}` : ''}
                    </Text>

                    {location?.city && (
                        <Text style={styles.location} numberOfLines={1}>
                            📍 {location.city}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        marginBottom: moderateScale(16),
    },
    imageContainer: {
        flex: 1,
        borderRadius: borderRadius.xl,
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
        fontSize: moderateScale(40),
    },
    blurOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '45%',
        borderTopColor: 'rgba(255,255,255,0.15)',
        borderTopWidth: 1,
    },
    verifiedBadge: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: BADGE_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    verifiedIcon: {
        fontSize: moderateScale(14),
        color: colors.info,
        fontWeight: '700',
    },
    compatibilityBadge: {
        position: 'absolute',
        top: moderateScale(8),
        left: moderateScale(8),
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    compatibilityText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.success,
        fontWeight: '600',
    },
    infoOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: moderateScale(12),
    },
    name: {
        fontSize: isSmallDevice ? responsiveFontSizes.sm : responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    location: {
        fontSize: responsiveFontSizes.xs,
        color: 'rgba(255,255,255,0.9)',
        marginTop: moderateScale(4),
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
