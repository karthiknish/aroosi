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
import { LinearGradient } from 'expo-linear-gradient';
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

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradient}
                />

                {/* Verified badge */}
                {isVerified && (
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedIcon}>✓</Text>
                    </View>
                )}

                {/* Compatibility score */}
                {compatibility !== undefined && (
                    <View style={styles.compatibilityBadge}>
                        <Text style={styles.compatibilityText}>{compatibility}%</Text>
                    </View>
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
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '50%',
    },
    verifiedBadge: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        backgroundColor: colors.info,
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: BADGE_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedIcon: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
        fontWeight: '700',
    },
    compatibilityBadge: {
        position: 'absolute',
        top: moderateScale(8),
        left: moderateScale(8),
        backgroundColor: colors.success,
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
    },
    compatibilityText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
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
    },
    location: {
        fontSize: responsiveFontSizes.xs,
        color: 'rgba(255,255,255,0.85)',
        marginTop: moderateScale(4),
    },
});
