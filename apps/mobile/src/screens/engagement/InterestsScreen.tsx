/**
 * Interests Screen - View sent and received interests
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
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
    getSentInterests,
    getReceivedInterests,
    acceptInterest,
    declineInterest,
    type Interest,
} from '../../services/api/interests';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'Interests'>;
type TabType = 'received' | 'sent';

export default function InterestsScreen() {
    const navigation = useNavigation<Navigation>();
    const [activeTab, setActiveTab] = useState<TabType>('received');
    const [receivedInterests, setReceivedInterests] = useState<Interest[]>([]);
    const [sentInterests, setSentInterests] = useState<Interest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load interests
    const loadInterests = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [receivedRes, sentRes] = await Promise.all([
                getReceivedInterests(),
                getSentInterests(),
            ]);

            if (receivedRes.error) {
                setError(receivedRes.error);
                return;
            }

            setReceivedInterests(receivedRes.data || []);
            setSentInterests(sentRes.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load interests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadInterests();
    }, [loadInterests]);

    // Handle accept interest
    const handleAccept = useCallback(async (interestId: string) => {
        try {
            setActionLoading(interestId);
            const response = await acceptInterest(interestId);

            if (response.data?.success) {
                setReceivedInterests((prev) =>
                    prev.map((i) =>
                        i.id === interestId ? { ...i, status: 'accepted' } : i
                    )
                );

                if (response.data.matchId) {
                    Alert.alert(
                        "It's a Match! 💕",
                        'You can now message each other!',
                        [{ text: 'Great!' }]
                    );
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to accept interest');
        } finally {
            setActionLoading(null);
        }
    }, []);

    // Handle decline interest
    const handleDecline = useCallback(async (interestId: string) => {
        Alert.alert(
            'Decline Interest',
            'Are you sure you want to decline this interest?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(interestId);
                            const response = await declineInterest(interestId);

                            if (response.data?.success) {
                                setReceivedInterests((prev) =>
                                    prev.map((i) =>
                                        i.id === interestId ? { ...i, status: 'declined' } : i
                                    )
                                );
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to decline interest');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    }, []);

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Get status badge
    const getStatusBadge = (status: Interest['status']) => {
        const styles: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: colors.warning + '20', text: colors.warning, label: 'Pending' },
            accepted: { bg: colors.success + '20', text: colors.success, label: 'Accepted' },
            declined: { bg: colors.error + '20', text: colors.error, label: 'Declined' },
            expired: { bg: colors.neutral[200], text: colors.neutral[500], label: 'Expired' },
        };
        return styles[status] || styles.pending;
    };

    // Render interest item
    const renderItem = useCallback(
        ({ item }: { item: Interest }) => {
            const user = item.user;
            const isLoading = actionLoading === item.id;
            const statusBadge = getStatusBadge(item.status);
            const isPending = item.status === 'pending';
            const isReceived = activeTab === 'received';

            return (
                <View style={styles.itemContainer}>
                    <View style={styles.itemContent}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {user?.profileImageUrls && user.profileImageUrls[0] ? (
                                <Image
                                    source={{ uri: user.profileImageUrls[0] }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {user?.fullName?.charAt(0) || '?'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.name} numberOfLines={1}>
                                {user?.fullName || 'Member'}
                            </Text>
                            <View style={styles.metaRow}>
                                {user?.city && (
                                    <Text style={styles.location}>📍 {user.city}</Text>
                                )}
                                {user?.age && (
                                    <Text style={styles.age}>{user.age} yrs</Text>
                                )}
                            </View>
                            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                        </View>

                        {/* Status/Actions */}
                        <View style={styles.statusContainer}>
                            {!isPending || !isReceived ? (
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: statusBadge.bg },
                                    ]}
                                >
                                    <Text style={[styles.statusText, { color: statusBadge.text }]}>
                                        {statusBadge.label}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Action buttons for pending received interests */}
                    {isPending && isReceived && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.declineButton]}
                                onPress={() => handleDecline(item.id)}
                                disabled={isLoading}
                            >
                                <Text style={styles.declineButtonText}>
                                    {isLoading ? '...' : 'Decline'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.acceptButton]}
                                onPress={() => handleAccept(item.id)}
                                disabled={isLoading}
                            >
                                <Text style={styles.acceptButtonText}>
                                    {isLoading ? '...' : 'Accept'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            );
        },
        [activeTab, actionLoading, handleAccept, handleDecline]
    );

    const currentData = activeTab === 'received' ? receivedInterests : sentInterests;
    const pendingCount = receivedInterests.filter((i) => i.status === 'pending').length;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Interests</Text>
                    <View style={{ width: 50 }} />
                </View>
                <LoadingSpinner message="Loading interests..." />
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
                    <Text style={styles.title}>Interests</Text>
                    <View style={{ width: 50 }} />
                </View>
                <EmptyState
                    emoji="😕"
                    title="Something went wrong"
                    message={error}
                    actionLabel="Try Again"
                    onAction={() => loadInterests()}
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
                <Text style={styles.title}>Interests</Text>
                <View style={{ width: 50 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'received' && styles.tabActive]}
                    onPress={() => setActiveTab('received')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'received' && styles.tabTextActive,
                        ]}
                    >
                        Received
                    </Text>
                    {pendingCount > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
                    onPress={() => setActiveTab('sent')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'sent' && styles.tabTextActive,
                        ]}
                    >
                        Sent
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={currentData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadInterests(true)}
                        tintColor={colors.primary.DEFAULT}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        emoji={activeTab === 'received' ? '💌' : '💝'}
                        title={
                            activeTab === 'received'
                                ? 'No interests received'
                                : 'No interests sent'
                        }
                        message={
                            activeTab === 'received'
                                ? 'When someone expresses interest in you, it will appear here.'
                                : "Express interest in profiles you like and they'll appear here."
                        }
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
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.background.light,
        paddingHorizontal: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing[3],
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        gap: spacing[2],
    },
    tabActive: {
        borderBottomColor: colors.primary.DEFAULT,
    },
    tabText: {
        fontSize: fontSize.base,
        color: colors.neutral[500],
        fontWeight: fontWeight.medium,
    },
    tabTextActive: {
        color: colors.primary.DEFAULT,
    },
    tabBadge: {
        backgroundColor: colors.primary.DEFAULT,
        paddingHorizontal: spacing[2],
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        fontSize: fontSize.xs,
        color: '#FFFFFF',
        fontWeight: fontWeight.bold,
    },
    listContent: {
        padding: spacing[4],
        paddingBottom: spacing[8],
    },
    itemContainer: {
        backgroundColor: colors.background.light,
        borderRadius: borderRadius.xl,
        marginBottom: spacing[3],
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
        padding: spacing[4],
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
    date: {
        fontSize: fontSize.xs,
        color: colors.neutral[400],
        marginTop: spacing[1],
    },
    statusContainer: {
        marginLeft: spacing[2],
    },
    statusBadge: {
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        borderRadius: borderRadius.md,
    },
    statusText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
    },
    actionButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    actionButton: {
        flex: 1,
        paddingVertical: spacing[3],
        alignItems: 'center',
    },
    declineButton: {
        borderRightWidth: 1,
        borderRightColor: colors.border.light,
    },
    declineButtonText: {
        fontSize: fontSize.base,
        color: colors.neutral[600],
        fontWeight: fontWeight.medium,
    },
    acceptButton: {
        backgroundColor: colors.primary[50],
    },
    acceptButtonText: {
        fontSize: fontSize.base,
        color: colors.primary.DEFAULT,
        fontWeight: fontWeight.semibold,
    },
});
