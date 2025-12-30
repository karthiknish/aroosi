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
import { useAsyncAction, useAsyncActions } from '../../hooks/useAsyncAction';
import { useOffline } from '../../hooks/useOffline';

export default function HomeScreen() {
    const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { checkNetworkOrAlert } = useOffline();

    const loadAction = useAsyncAction(async () => {
        const response = await getRecommendations(20);
        if (response.error) throw new Error(response.error);
        if (response.data) {
            setProfiles(response.data);
            setCurrentIndex(0);
        }
        return response.data || [];
    }, { errorMode: 'inline' });

    const swipeActions = useAsyncActions({
        like: async (params: { profileId: string, isSuperLike: boolean, displayName?: string }) => {
            const { profileId, isSuperLike, displayName } = params;
            const response = await likeUser(profileId, isSuperLike);
            if (response.data?.matched) {
                Alert.alert(
                    isSuperLike ? "It's a Match! ⭐" : "It's a Match! 💕",
                    isSuperLike 
                        ? `Your Super Like worked! You matched with ${displayName || 'this person'}!`
                        : `You and ${displayName || 'this person'} liked each other!`,
                    [{ text: isSuperLike ? 'Awesome!' : 'Keep Swiping', style: 'default' }]
                );
            }
            setCurrentIndex(prev => prev + 1);
            return response.data;
        },
        pass: async (profileId: string) => {
            await passUser(profileId);
            setCurrentIndex(prev => prev + 1);
        }
    }, { errorMode: 'silent', networkAware: true });

    const loading = loadAction.loading;
    const error = loadAction.error;
    const refreshing = loadAction.loading && profiles.length > 0;

    useEffect(() => {
        loadAction.execute();
    }, []);

    // Handle like action
    const handleLike = useCallback(() => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        const profileId = currentProfile.id || currentProfile.userId;
        if (!profileId) return;

        if (!checkNetworkOrAlert(() => handleLike())) return;
        swipeActions.execute.like({ 
            profileId, 
            isSuperLike: false, 
            displayName: currentProfile.displayName || undefined
        });
    }, [profiles, currentIndex, swipeActions.execute, checkNetworkOrAlert]);

    // Handle super like action
    const handleSuperLike = useCallback(() => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        const profileId = currentProfile.id || currentProfile.userId;
        if (!profileId) return;

        if (!checkNetworkOrAlert(() => handleSuperLike())) return;
        swipeActions.execute.like({ 
            profileId, 
            isSuperLike: true, 
            displayName: currentProfile.displayName || undefined
        });
    }, [profiles, currentIndex, swipeActions.execute, checkNetworkOrAlert]);

    // Handle pass action
    const handlePass = useCallback(() => {
        const currentProfile = profiles[currentIndex];
        if (!currentProfile) return;

        const profileId = currentProfile.id || currentProfile.userId;
        if (!profileId) return;

        if (!checkNetworkOrAlert(() => handlePass())) return;
        swipeActions.execute.pass(profileId);
    }, [profiles, currentIndex, swipeActions.execute, checkNetworkOrAlert]);

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
                    onAction={() => loadAction.execute()}
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
                            onRefresh={() => loadAction.execute()}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                >
                    <EmptyState
                        emoji="🎉"
                        title="You're All Caught Up!"
                        message="You've seen all available profiles. Check back later for new matches or pull down to refresh."
                        actionLabel="Refresh"
                        onAction={() => loadAction.execute()}
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
