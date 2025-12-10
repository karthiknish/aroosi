/**
 * Profile Viewers Screen - Who viewed your profile
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getProfileViewers,
    markViewsAsSeen,
    type ProfileViewer,
} from '../../services/api/profileViewers';
import { getSubscriptionStatus } from '../../services/api/subscription';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileViewers'>;

export default function ProfileViewersScreen() {
    const navigation = useNavigation<Navigation>();
    const [viewers, setViewers] = useState<ProfileViewer[]>([]);
    const [total, setTotal] = useState(0);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load viewers
    const loadViewers = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [viewersRes, subRes] = await Promise.all([
                getProfileViewers(),
                getSubscriptionStatus(),
            ]);

            if (viewersRes.error) {
                setError(viewersRes.error);
                return;
            }

            if (viewersRes.data) {
                setViewers(viewersRes.data.viewers || []);
                setTotal(viewersRes.data.total || 0);
            }

            if (subRes.data) {
                const plan = subRes.data.plan?.toLowerCase() || 'free';
                setIsPremium(plan === 'premium' || plan === 'premiumplus');
            }

            // Mark views as seen
            await markViewsAsSeen();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load viewers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadViewers();
    }, [loadViewers]);

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffHours < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Render viewer item
    const renderItem = useCallback(
        ({ item, index }: { item: ProfileViewer; index: number }) => {
            const isBlurred = !isPremium && index >= 3;

            return (
                <TouchableOpacity
                    style={styles.itemContainer}
                    activeOpacity={isPremium ? 0.7 : 1}
                    onPress={() => {
                        if (isPremium) {
                            // Navigate to profile detail - would need to add this to navigation
                            // navigation.navigate('ProfileDetail', { userId: item.userId });
                        } else if (index >= 3) {
                            navigation.navigate('Subscription');
                        }
                    }}
                >
                    {/* Blurred overlay for non-premium */}
                    {isBlurred && (
                        <View style={styles.blurOverlay}>
                            <Text style={styles.lockIcon}>🔒</Text>
                        </View>
                    )}

                    <View style={[styles.itemContent, isBlurred && styles.itemBlurred]}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {item.profileImageUrls && item.profileImageUrls[0] ? (
                                <Image
                                    source={{ uri: item.profileImageUrls[0] }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                    blurRadius={isBlurred ? 20 : 0}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {isBlurred ? '?' : item.fullName?.charAt(0) || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.name} numberOfLines={1}>
                                {isBlurred ? '••••••••' : item.fullName || 'Member'}
                            </Text>
                            <View style={styles.metaRow}>
                                {item.city && !isBlurred && (
                                    <Text style={styles.location}>📍 {item.city}</Text>
                                )}
                                {item.age && !isBlurred && (
                                    <Text style={styles.age}>{item.age} yrs</Text>
                                )}
                            </View>
                        </View>

                        {/* Time */}
                        <Text style={styles.viewedAt}>
                            {isBlurred ? '•••' : formatDate(item.viewedAt)}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        },
        [isPremium, navigation]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Who Viewed Me</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading viewers..." />
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
                    <Text style={styles.title}>Who Viewed Me</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadViewers()}
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
                <Text style={styles.title}>Who Viewed Me</Text>
                <Text style={styles.count}>{total}</Text>
            </View>

            {/* Premium banner */}
            {!isPremium && viewers.length > 3 && (
                <TouchableOpacity
                    style={styles.premiumBanner}
                    onPress={() => navigation.navigate('Subscription')}
                >
                    <View style={styles.premiumContent}>
                        <Text style={styles.premiumIcon}>⭐</Text>
                        <View style={styles.premiumText}>
                            <Text style={styles.premiumTitle}>
                                {viewers.length - 3} more people viewed your profile
                            </Text>
                            <Text style={styles.premiumSubtitle}>
                                Upgrade to Premium to see all viewers
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.premiumArrow}>→</Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={viewers}
                renderItem={renderItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadViewers(true)}
                        tintColor={colors.primary.DEFAULT}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        emoji="👀"
                        title="No views yet"
                        message="When someone views your profile, they'll appear here."
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        backgroundColor: colors.background.light,
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
    count: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
        minWidth: 50,
        textAlign: 'right',
    },
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '15',
        padding: spacing[4],
        margin: spacing[4],
        marginBottom: 0,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.warning + '30',
    },
    premiumContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumIcon: {
        fontSize: 24,
        marginRight: spacing[3],
    },
    premiumText: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    premiumSubtitle: {
        fontSize: fontSize.sm,
        color: colors.neutral[600],
        marginTop: spacing[1],
    },
    premiumArrow: {
        fontSize: fontSize.xl,
        color: colors.warning,
    },
    listContent: {
        padding: spacing[4],
        paddingBottom: spacing[8],
    },
    itemContainer: {
        position: 'relative',
        marginBottom: spacing[3],
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing[4],
        backgroundColor: colors.background.light,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemBlurred: {
        opacity: 0.7,
    },
    blurOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.5)',
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockIcon: {
        fontSize: 24,
    },
    avatarContainer: {
        marginRight: spacing[3],
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: fontSize.xl,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.bold,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    metaRow: {
        flexDirection: 'row',
        gap: spacing[3],
        marginTop: spacing[1],
    },
    location: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    age: {
        fontSize: fontSize.sm,
        color: colors.neutral[500],
    },
    viewedAt: {
        fontSize: fontSize.sm,
        color: colors.neutral[400],
    },
});
