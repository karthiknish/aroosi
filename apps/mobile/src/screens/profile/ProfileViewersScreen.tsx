/**
 * Profile Viewers Screen - Who viewed your profile
 * Enhanced with filter tabs, pagination, new viewer badges, and profile navigation
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
    moderateScale,
} from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getProfileViewers,
    markViewsAsSeen,
    groupViewersByDate,
    type ProfileViewer,
    type ViewerFilter,
} from '../../services/api/profileViewers';
import { getSubscriptionStatus } from '../../services/api/subscription';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileViewers'>;

const FILTERS: { key: ViewerFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
];

const PAGE_SIZE = 20;

export default function ProfileViewersScreen() {
    const navigation = useNavigation<Navigation>();
    const [viewers, setViewers] = useState<ProfileViewer[]>([]);
    const [total, setTotal] = useState(0);
    const [newCount, setNewCount] = useState(0);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [activeFilter, setActiveFilter] = useState<ViewerFilter>('all');

    // Group viewers by date for section display
    const groupedViewers = useMemo(() => {
        if (activeFilter !== 'all') {
            return null; // Don't group when filtering
        }
        return groupViewersByDate(viewers);
    }, [viewers, activeFilter]);

    // Load viewers
    const loadViewers = useCallback(async (
        isRefresh = false,
        filter: ViewerFilter = activeFilter,
        pageNum = 0
    ) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
                setPage(0);
            } else if (pageNum > 0) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [viewersRes, subRes] = await Promise.all([
                getProfileViewers(pageNum, PAGE_SIZE, filter),
                pageNum === 0 ? getSubscriptionStatus() : Promise.resolve({ data: null }),
            ]);

            if (viewersRes.error) {
                setError(viewersRes.error);
                return;
            }

            if (viewersRes.data) {
                const newViewers = viewersRes.data.viewers || [];
                if (pageNum === 0) {
                    setViewers(newViewers);
                } else {
                    setViewers(prev => [...prev, ...newViewers]);
                }
                setTotal(viewersRes.data.total || 0);
                setNewCount(viewersRes.data.newCount || 0);
                setHasMore(viewersRes.data.hasMore || false);
            }

            if (subRes.data) {
                const plan = subRes.data.plan?.toLowerCase() || 'free';
                setIsPremium(plan === 'premium' || plan === 'premiumplus');
            }

            // Mark views as seen on first load
            if (pageNum === 0 && !isRefresh) {
                await markViewsAsSeen();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load viewers');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        loadViewers(false, activeFilter, 0);
    }, [activeFilter]);

    // Handle filter change
    const handleFilterChange = (filter: ViewerFilter) => {
        if (filter !== activeFilter) {
            setActiveFilter(filter);
            setPage(0);
            setViewers([]);
        }
    };

    // Handle load more
    const handleLoadMore = () => {
        if (!loadingMore && hasMore && isPremium) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadViewers(false, activeFilter, nextPage);
        }
    };

    // Navigate to viewer profile
    const navigateToProfile = (userId: string) => {
        navigation.navigate('ProfileDetail', { userId });
    };

    // Format date
    const formatDate = (dateValue: string | number) => {
        const date = new Date(dateValue);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffHours < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Render section header
    const renderSectionHeader = (title: string, count: number) => {
        if (count === 0) return null;
        return (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionCount}>{count}</Text>
            </View>
        );
    };

    // Render viewer item
    const renderItem = useCallback(
        ({ item, index }: { item: ProfileViewer; index: number }) => {
            const isBlurred = !isPremium && index >= 3;
            const viewerId = item.userId || (item as any).viewerId;

            return (
                <TouchableOpacity
                    style={styles.itemContainer}
                    activeOpacity={isPremium ? 0.7 : 1}
                    onPress={() => {
                        if (isPremium) {
                            navigateToProfile(viewerId);
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
                        {/* New viewer badge */}
                        {item.isNew && !isBlurred && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}

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
                                {item.age && !isBlurred && (
                                    <Text style={styles.age}>{item.age} yrs</Text>
                                )}
                                {item.city && !isBlurred && (
                                    <Text style={styles.location}>📍 {item.city}</Text>
                                )}
                            </View>
                            {item.viewCount && item.viewCount > 1 && !isBlurred && (
                                <Text style={styles.viewCount}>
                                    Viewed {item.viewCount} times
                                </Text>
                            )}
                        </View>

                        {/* Time */}
                        <View style={styles.timeContainer}>
                            <Text style={styles.viewedAt}>
                                {isBlurred ? '•••' : formatDate(item.viewedAt)}
                            </Text>
                            {isPremium && !isBlurred && (
                                <Text style={styles.viewArrow}>→</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            );
        },
        [isPremium, navigation]
    );

    // Render footer for loading more
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            </View>
        );
    };

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
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Who Viewed Me</Text>
                    {newCount > 0 && (
                        <View style={styles.newCountBadge}>
                            <Text style={styles.newCountText}>{newCount} new</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.count}>{total}</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {FILTERS.map(({ key, label }) => (
                    <TouchableOpacity
                        key={key}
                        style={[
                            styles.filterTab,
                            activeFilter === key && styles.filterTabActive,
                        ]}
                        onPress={() => handleFilterChange(key)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                activeFilter === key && styles.filterTextActive,
                            ]}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
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
                                {total - 3} more people viewed your profile
                            </Text>
                            <Text style={styles.premiumSubtitle}>
                                Upgrade to Premium to see all viewers
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.premiumArrow}>→</Text>
                </TouchableOpacity>
            )}

            {/* Grouped view for 'all' filter */}
            {groupedViewers && activeFilter === 'all' ? (
                <FlatList
                    data={[]}
                    renderItem={null}
                    ListHeaderComponent={
                        <>
                            {renderSectionHeader('Today', groupedViewers.today.length)}
                            {groupedViewers.today.map((item, idx) => (
                                <View key={item.userId || idx}>
                                    {renderItem({ item, index: idx })}
                                </View>
                            ))}
                            {renderSectionHeader('This Week', groupedViewers.thisWeek.length)}
                            {groupedViewers.thisWeek.map((item, idx) => (
                                <View key={item.userId || idx}>
                                    {renderItem({
                                        item,
                                        index: groupedViewers.today.length + idx,
                                    })}
                                </View>
                            ))}
                            {renderSectionHeader('Earlier', groupedViewers.earlier.length)}
                            {groupedViewers.earlier.map((item, idx) => (
                                <View key={item.userId || idx}>
                                    {renderItem({
                                        item,
                                        index: groupedViewers.today.length + groupedViewers.thisWeek.length + idx,
                                    })}
                                </View>
                            ))}
                        </>
                    }
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadViewers(true)}
                            tintColor={colors.primary.DEFAULT}
                        />
                    }
                    ListEmptyComponent={
                        viewers.length === 0 ? (
                            <EmptyState
                                emoji="👀"
                                title="No views yet"
                                message="When someone views your profile, they'll appear here."
                            />
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={viewers}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.userId || `viewer-${index}`}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
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
                            title={activeFilter === 'all' ? 'No views yet' : `No views ${activeFilter}`}
                            message="When someone views your profile, they'll appear here."
                        />
                    }
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

// Responsive avatar size
const AVATAR_SIZE = responsiveValues.avatarSmall;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        backgroundColor: colors.background.light,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(8),
        flex: 1,
        justifyContent: 'center',
    },
    backButton: {
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
        paddingRight: moderateScale(8),
    },
    title: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    count: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        minWidth: moderateScale(40),
        textAlign: 'right',
    },
    newCountBadge: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(8),
        paddingVertical: moderateScale(2),
        borderRadius: borderRadius.full,
    },
    newCountText: {
        fontSize: responsiveFontSizes.xs,
        color: '#FFFFFF',
        fontWeight: fontWeight.semibold,
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: colors.background.light,
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(8),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        gap: moderateScale(6),
        flexWrap: 'wrap',
    },
    filterTab: {
        paddingHorizontal: isSmallDevice ? moderateScale(8) : moderateScale(12),
        paddingVertical: moderateScale(6),
        borderRadius: borderRadius.lg,
        backgroundColor: colors.neutral[100],
    },
    filterTabActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    filterText: {
        fontSize: isSmallDevice ? responsiveFontSizes.xs : responsiveFontSizes.sm,
        color: colors.neutral[600],
        fontWeight: fontWeight.medium,
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: moderateScale(8),
        marginTop: moderateScale(12),
    },
    sectionTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCount: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
    },
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '15',
        padding: responsiveValues.cardPadding,
        margin: responsiveValues.screenPadding,
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
        fontSize: moderateScale(24),
        marginRight: moderateScale(12),
    },
    premiumText: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    premiumSubtitle: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        marginTop: moderateScale(4),
    },
    premiumArrow: {
        fontSize: responsiveFontSizes.xl,
        color: colors.warning,
    },
    listContent: {
        padding: responsiveValues.screenPadding,
        paddingBottom: moderateScale(32),
    },
    itemContainer: {
        position: 'relative',
        marginBottom: responsiveValues.itemSpacing,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: responsiveValues.cardPadding,
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
        fontSize: moderateScale(24),
    },
    newBadge: {
        position: 'absolute',
        top: moderateScale(8),
        right: moderateScale(8),
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: moderateScale(6),
        paddingVertical: moderateScale(2),
        borderRadius: borderRadius.md,
        zIndex: 5,
    },
    newBadgeText: {
        fontSize: moderateScale(10),
        color: '#FFFFFF',
        fontWeight: fontWeight.bold,
    },
    avatarContainer: {
        marginRight: moderateScale(12),
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: responsiveFontSizes.lg,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.bold,
    },
    infoContainer: {
        flex: 1,
        marginRight: moderateScale(8),
    },
    name: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    metaRow: {
        flexDirection: 'row',
        gap: moderateScale(8),
        marginTop: moderateScale(4),
        flexWrap: 'wrap',
    },
    location: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    age: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
    },
    viewCount: {
        fontSize: responsiveFontSizes.xs,
        color: colors.primary.DEFAULT,
        marginTop: moderateScale(4),
    },
    timeContainer: {
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    viewedAt: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[400],
    },
    viewArrow: {
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
        marginTop: moderateScale(4),
    },
    footerLoader: {
        paddingVertical: moderateScale(16),
        alignItems: 'center',
    },
});

