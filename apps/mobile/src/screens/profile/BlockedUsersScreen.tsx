/**
 * Blocked Users Screen - Manage blocked users
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
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { 
    colors, 
    spacing, 
    fontSize, 
    fontWeight, 
    borderRadius,
    moderateScale,
    responsiveValues,
    responsiveFontSizes,
    isSmallDevice,
} from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getBlockedUsers, unblockUser } from '../../services/api/matches';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'BlockedUsers'>;

interface BlockedUser {
    userId: string;
    blockedAt: string;
}

export default function BlockedUsersScreen() {
    const navigation = useNavigation<Navigation>();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unblocking, setUnblocking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load blocked users
    const loadBlockedUsers = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await getBlockedUsers();

            if (response.error) {
                setError(response.error);
                return;
            }

            setBlockedUsers(response.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load blocked users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadBlockedUsers();
    }, [loadBlockedUsers]);

    // Handle unblock
    const handleUnblock = useCallback(async (userId: string) => {
        Alert.alert(
            'Unblock User',
            'Are you sure you want to unblock this user? They will be able to see your profile and contact you again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    onPress: async () => {
                        try {
                            setUnblocking(userId);
                            const response = await unblockUser(userId);

                            if (!response.error) {
                                setBlockedUsers((prev) =>
                                    prev.filter((u) => u.userId !== userId)
                                );
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to unblock user');
                        } finally {
                            setUnblocking(null);
                        }
                    },
                },
            ]
        );
    }, []);

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Render blocked user item
    const renderItem = useCallback(
        ({ item }: { item: BlockedUser }) => {
            const isUnblocking = unblocking === item.userId;

            return (
                <View style={styles.itemContainer}>
                    <View style={styles.itemContent}>
                        {/* Avatar placeholder */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>🚫</Text>
                            </View>
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.userId} numberOfLines={1}>
                                User ID: {item.userId.slice(0, 8)}...
                            </Text>
                            <Text style={styles.date}>
                                Blocked on {formatDate(item.blockedAt)}
                            </Text>
                        </View>

                        {/* Unblock button */}
                        <TouchableOpacity
                            style={[
                                styles.unblockButton,
                                isUnblocking && styles.unblockButtonDisabled,
                            ]}
                            onPress={() => handleUnblock(item.userId)}
                            disabled={isUnblocking}
                        >
                            <Text style={styles.unblockButtonText}>
                                {isUnblocking ? '...' : 'Unblock'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        },
        [unblocking, handleUnblock]
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Blocked Users</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading blocked users..." />
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
                    <Text style={styles.title}>Blocked Users</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadBlockedUsers()}
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
                <Text style={styles.title}>Blocked Users</Text>
                <Text style={styles.count}>{blockedUsers.length}</Text>
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                    Blocked users cannot see your profile or send you messages. Unblocking will allow them to interact with you again.
                </Text>
            </View>

            <FlatList
                data={blockedUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadBlockedUsers(true)}
                        tintColor={colors.primary.DEFAULT}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        emoji="✅"
                        title="No blocked users"
                        message="You haven't blocked anyone. That's great!"
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// Responsive avatar size
const AVATAR_SIZE = isSmallDevice ? 40 : 48;

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
    backButton: {
        fontSize: responsiveFontSizes.base,
        color: colors.primary.DEFAULT,
    },
    title: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    count: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[500],
        minWidth: moderateScale(50),
        textAlign: 'right',
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: colors.info + '10',
        padding: responsiveValues.cardPadding,
        margin: responsiveValues.screenPadding,
        marginBottom: 0,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.info + '20',
    },
    infoIcon: {
        fontSize: moderateScale(16),
        marginRight: moderateScale(12),
    },
    infoText: {
        flex: 1,
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[600],
        lineHeight: moderateScale(20),
    },
    listContent: {
        padding: responsiveValues.screenPadding,
        paddingBottom: moderateScale(32),
    },
    itemContainer: {
        backgroundColor: colors.background.light,
        borderRadius: borderRadius.xl,
        marginBottom: responsiveValues.itemSpacing,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: responsiveValues.cardPadding,
    },
    avatarContainer: {
        marginRight: moderateScale(12),
    },
    avatarPlaceholder: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: moderateScale(20),
    },
    infoContainer: {
        flex: 1,
    },
    userId: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.medium,
        color: colors.neutral[700],
    },
    date: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[500],
        marginTop: moderateScale(4),
    },
    unblockButton: {
        backgroundColor: colors.neutral[100],
        paddingVertical: moderateScale(8),
        paddingHorizontal: moderateScale(16),
        borderRadius: borderRadius.lg,
    },
    unblockButtonDisabled: {
        opacity: 0.6,
    },
    unblockButtonText: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
});
