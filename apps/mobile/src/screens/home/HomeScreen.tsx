/**
 * Home Screen - Main swipe/match screen with profile cards
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
} from '../../theme';
import { SwipeCard } from '../../components/SwipeCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getRecommendations,
    type RecommendedProfile
} from '../../services/api/recommendations';
import { likeUser, passUser } from '../../services/api/matches';

export default function HomeScreen() {
    const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load recommendations
    const loadRecommendations = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await getRecommendations(20);

            if (response.error) {
                setError(response.error);
                return;
            }

            if (response.data) {
                setProfiles(response.data);
                setCurrentIndex(0);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profiles');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    // Handle like action
    const handleLike = useCallback(async () => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        try {
            const response = await likeUser(currentProfile.id, false);

            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! 💕",
                    `You and ${currentProfile.displayName || 'this person'} liked each other!`,
                    [{ text: 'Keep Swiping', style: 'default' }]
                );
            }

            // Move to next profile
            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error('Like failed:', err);
        }
    }, [profiles, currentIndex]);

    // Handle super like action
    const handleSuperLike = useCallback(async () => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        try {
            const response = await likeUser(currentProfile.id, true);

            if (response.data?.matched) {
                Alert.alert(
                    "It's a Match! ⭐",
                    `Your Super Like worked! You matched with ${currentProfile.displayName || 'this person'}!`,
                    [{ text: 'Awesome!', style: 'default' }]
                );
            }

            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error('Super like failed:', err);
        }
    }, [profiles, currentIndex]);

    // Handle pass action
    const handlePass = useCallback(async () => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        try {
            await passUser(currentProfile.id);
            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error('Pass failed:', err);
        }
    }, [profiles, currentIndex]);

    // Handle info action
    const handleInfo = useCallback(() => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        Alert.alert(
            currentProfile.displayName || 'Profile',
            currentProfile.bio || 'No bio available',
            [{ text: 'OK' }]
        );
    }, [profiles, currentIndex]);

    // Get current profile
    const currentProfile = profiles[currentIndex];
    const hasMoreProfiles = currentIndex < profiles.length;

    // Render loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={styles.logo}>💍</Text>
                    <Text style={styles.title}>Aroosi</Text>
                </View>
                <LoadingSpinner message="Finding matches..." />
            </SafeAreaView>
        );
    }

    // Render error state
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={styles.logo}>💍</Text>
                    <Text style={styles.title}>Aroosi</Text>
                </View>
                <EmptyState
                    emoji="😕"
                    title="Oops!"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadRecommendations()}
                />
            </SafeAreaView>
        );
    }

    // Render empty/end state
    if (!hasMoreProfiles) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={styles.logo}>💍</Text>
                    <Text style={styles.title}>Aroosi</Text>
                </View>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadRecommendations(true)}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                >
                    <EmptyState
                        emoji="🎉"
                        title="You're All Caught Up!"
                        message="You've seen all available profiles. Check back later for new matches or pull down to refresh."
                        actionLabel="Refresh"
                        onAction={() => loadRecommendations(true)}
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.logo}>💍</Text>
                <Text style={styles.title}>Aroosi</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.counter}>
                        {currentIndex + 1} / {profiles.length}
                    </Text>
                </View>
            </View>

            {/* Swipe Card */}
            <View style={styles.cardContainer}>
                {currentProfile && (
                    <SwipeCard
                        profile={currentProfile}
                        onLike={handleLike}
                        onPass={handlePass}
                        onSuperLike={handleSuperLike}
                        onInfo={handleInfo}
                    />
                )}
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
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    logo: {
        fontSize: moderateScale(28),
        marginRight: moderateScale(8),
    },
    title: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counter: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        flex: 1,
    },
});
