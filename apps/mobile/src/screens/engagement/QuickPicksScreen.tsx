/**
 * Quick Picks Screen - Daily swipe deck feature
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getDailyQuickPicks,
    actOnQuickPick,
    getQuickPicksLimit,
    type QuickPickProfile,
} from '../../services/api/engagement';
import { getSubscriptionStatus } from '../../services/api/subscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'QuickPicks'>;

export default function QuickPicksScreen() {
    const navigation = useNavigation<Navigation>();
    const [profiles, setProfiles] = useState<QuickPickProfile[]>([]);
    const [userIds, setUserIds] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dailyLimit, setDailyLimit] = useState(5);
    const [actionsToday, setActionsToday] = useState(0);

    const position = useRef(new Animated.ValueXY()).current;

    // Load quick picks
    const loadQuickPicks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [picksRes, subRes] = await Promise.all([
                getDailyQuickPicks(),
                getSubscriptionStatus(),
            ]);

            if (picksRes.error) {
                setError(picksRes.error);
                return;
            }

            if (picksRes.data) {
                setProfiles(picksRes.data.profiles || []);
                setUserIds(picksRes.data.userIds || []);
            }

            if (subRes.data) {
                setDailyLimit(getQuickPicksLimit(subRes.data.plan || 'free'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load quick picks');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadQuickPicks();
    }, [loadQuickPicks]);

    // Pan responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    swipeRight();
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    swipeLeft();
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
        }).start();
    };

    const swipeRight = () => {
        Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: 0 },
            duration: 250,
            useNativeDriver: false,
        }).start(() => handleAction('like'));
    };

    const swipeLeft = () => {
        Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
            duration: 250,
            useNativeDriver: false,
        }).start(() => handleAction('skip'));
    };

    const handleAction = async (action: 'like' | 'skip') => {
        const currentUserId = userIds[currentIndex];
        if (!currentUserId) return;

        if (actionsToday >= dailyLimit) {
            Alert.alert(
                'Daily Limit Reached',
                `You've used all ${dailyLimit} quick picks for today. Upgrade for more!`,
                [{ text: 'OK' }]
            );
            position.setValue({ x: 0, y: 0 });
            return;
        }

        try {
            await actOnQuickPick(currentUserId, action);
            setActionsToday((prev) => prev + 1);
            setCurrentIndex((prev) => prev + 1);
            position.setValue({ x: 0, y: 0 });
        } catch (err) {
            console.error('Quick pick action failed:', err);
            position.setValue({ x: 0, y: 0 });
        }
    };

    const getCardStyle = () => {
        const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-30deg', '0deg', '30deg'],
        });

        return {
            ...position.getLayout(),
            transform: [{ rotate }],
        };
    };

    const getLikeOpacity = () => {
        return position.x.interpolate({
            inputRange: [0, SCREEN_WIDTH * 0.25],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });
    };

    const getSkipOpacity = () => {
        return position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 0.25, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
    };

    const currentProfile = profiles.find((p) => p.userId === userIds[currentIndex]);
    const hasMorePicks = currentIndex < userIds.length;
    const remainingPicks = dailyLimit - actionsToday;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Quick Picks</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading your daily picks..." />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Quick Picks</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={loadQuickPicks}
                />
            </SafeAreaView>
        );
    }

    if (!hasMorePicks || userIds.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Quick Picks</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="🎉"
                    title="All Done!"
                    message="You've gone through all your quick picks for today. Check back tomorrow for more!"
                    actionLabel="Go Back"
                    onAction={() => navigation.goBack()}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Quick Picks</Text>
                <View style={styles.counterBadge}>
                    <Text style={styles.counterText}>{remainingPicks} left</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(actionsToday / dailyLimit) * 100}%` },
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {currentIndex + 1} / {userIds.length}
                </Text>
            </View>

            {/* Card Stack */}
            <View style={styles.cardContainer}>
                {/* Background cards for stack effect */}
                {userIds.slice(currentIndex + 1, currentIndex + 3).map((id, idx) => {
                    const profile = profiles.find((p) => p.userId === id);
                    return (
                        <View
                            key={id}
                            style={[
                                styles.card,
                                styles.stackedCard,
                                {
                                    top: 10 * (idx + 1),
                                    transform: [{ scale: 1 - 0.03 * (idx + 1) }],
                                },
                            ]}
                        >
                            {profile?.imageUrl || (profile?.profileImageUrls && profile.profileImageUrls[0]) ? (
                                <Image
                                    source={{ uri: profile?.profileImageUrls?.[0] || profile?.imageUrl || '' }}
                                    style={styles.cardImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.cardImagePlaceholder}>
                                    <Text style={styles.placeholderText}>
                                        {profile?.fullName?.charAt(0) || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Top card (swipeable) */}
                {currentProfile && (
                    <Animated.View
                        style={[styles.card, getCardStyle()]}
                        {...panResponder.panHandlers}
                    >
                        {/* Like overlay */}
                        <Animated.View
                            style={[styles.overlayLabel, styles.likeLabel, { opacity: getLikeOpacity() }]}
                        >
                            <Text style={styles.overlayText}>LIKE</Text>
                        </Animated.View>

                        {/* Skip overlay */}
                        <Animated.View
                            style={[styles.overlayLabel, styles.skipLabel, { opacity: getSkipOpacity() }]}
                        >
                            <Text style={[styles.overlayText, styles.skipText]}>SKIP</Text>
                        </Animated.View>

                        {currentProfile.imageUrl || (currentProfile.profileImageUrls && currentProfile.profileImageUrls[0]) ? (
                            <Image
                                source={{ uri: currentProfile.profileImageUrls?.[0] || currentProfile.imageUrl || '' }}
                                style={styles.cardImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.cardImagePlaceholder}>
                                <Text style={styles.placeholderText}>
                                    {currentProfile.fullName?.charAt(0) || '?'}
                                </Text>
                            </View>
                        )}

                        {/* Card info overlay */}
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardName}>
                                {currentProfile.fullName || 'Member'}
                            </Text>
                            {currentProfile.city && (
                                <Text style={styles.cardLocation}>📍 {currentProfile.city}</Text>
                            )}
                        </View>
                    </Animated.View>
                )}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.skipButton]}
                    onPress={() => swipeLeft()}
                >
                    <Text style={styles.skipButtonText}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton]}
                    onPress={() => swipeRight()}
                >
                    <Text style={styles.likeButtonText}>♥</Text>
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
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    backButton: {
        fontSize: fontSize.base,
        color: colors.primary.DEFAULT,
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    counterBadge: {
        backgroundColor: colors.primary[100],
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.full,
    },
    counterText: {
        fontSize: fontSize.sm,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.medium,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        gap: spacing[3],
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.neutral[200],
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary.DEFAULT,
        borderRadius: 2,
    },
    progressText: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing[4],
    },
    card: {
        width: SCREEN_WIDTH - spacing[8],
        height: '85%',
        backgroundColor: colors.background.light,
        borderRadius: borderRadius['2xl'],
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        position: 'absolute',
    },
    stackedCard: {
        shadowOpacity: 0.08,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 80,
        color: colors.primary.DEFAULT,
    },
    cardInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing[4],
        paddingBottom: spacing[6],
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cardName: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: '#FFFFFF',
    },
    cardLocation: {
        fontSize: fontSize.base,
        color: 'rgba(255,255,255,0.9)',
        marginTop: spacing[1],
    },
    overlayLabel: {
        position: 'absolute',
        top: spacing[8],
        zIndex: 10,
        padding: spacing[3],
        borderWidth: 3,
        borderRadius: borderRadius.lg,
    },
    likeLabel: {
        right: spacing[6],
        borderColor: colors.success,
        transform: [{ rotate: '15deg' }],
    },
    skipLabel: {
        left: spacing[6],
        borderColor: colors.error,
        transform: [{ rotate: '-15deg' }],
    },
    overlayText: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.success,
    },
    skipText: {
        color: colors.error,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing[8],
        paddingVertical: spacing[6],
        paddingBottom: spacing[8],
    },
    actionButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    skipButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: colors.error,
    },
    skipButtonText: {
        fontSize: 28,
        color: colors.error,
    },
    likeButton: {
        backgroundColor: colors.primary.DEFAULT,
    },
    likeButtonText: {
        fontSize: 28,
        color: '#FFFFFF',
    },
});
