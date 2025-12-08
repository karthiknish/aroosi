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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { RecommendedProfile } from '../services/api/recommendations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - spacing[6] * 3) / 2;
const ITEM_HEIGHT = ITEM_WIDTH * 1.3;

interface ProfileGridItemProps {
    profile: RecommendedProfile;
    onPress?: () => void;
}

export function ProfileGridItem({ profile, onPress }: ProfileGridItemProps) {
    const { displayName, photoURL, photos, age, location, isVerified, compatibility } = profile;

    const mainPhoto = photos?.[0] || photoURL;

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
                        <Text style={styles.placeholderEmoji}>👤</Text>
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
        marginBottom: spacing[4],
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
        fontSize: 40,
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
        top: spacing[2],
        right: spacing[2],
        backgroundColor: colors.info,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedIcon: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    compatibilityBadge: {
        position: 'absolute',
        top: spacing[2],
        left: spacing[2],
        backgroundColor: colors.success,
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.full,
    },
    compatibilityText: {
        fontSize: fontSize.xs,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    infoOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: spacing[3],
    },
    name: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
    location: {
        fontSize: fontSize.xs,
        color: 'rgba(255,255,255,0.85)',
        marginTop: spacing[1],
    },
});
