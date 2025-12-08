/**
 * Messages Screen - Chat list / conversations
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { ConversationItem } from '../../components/ConversationItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getConversations, type Conversation } from '../../services/api/messages';
import { getMatches, type Match } from '../../services/api/matches';

type MessagesNavigation = NativeStackNavigationProp<MessagesStackParamList, 'MessagesMain'>;

export default function MessagesScreen() {
    const navigation = useNavigation<MessagesNavigation>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Load conversations and matches
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Load both conversations and new matches in parallel
            const [conversationsRes, matchesRes] = await Promise.all([
                getConversations(),
                getMatches(),
            ]);

            if (conversationsRes.error) {
                setError(conversationsRes.error);
                return;
            }

            if (conversationsRes.data) {
                setConversations(conversationsRes.data);
            }

            if (matchesRes.data) {
                // Filter matches that don't have conversations yet
                const newMatches = matchesRes.data.filter(m =>
                    m.status === 'matched' && !m.lastMessage
                );
                setMatches(newMatches);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle conversation press
    const handleConversationPress = useCallback((conversation: Conversation) => {
        navigation.navigate('Chat', {
            matchId: conversation.matchId,
            recipientName: conversation.user.displayName || 'Unknown',
            recipientPhoto: conversation.user.photoURL || undefined,
        });
    }, [navigation]);

    // Handle new match press
    const handleMatchPress = useCallback((match: Match) => {
        navigation.navigate('Chat', {
            matchId: match.id,
            recipientName: match.matchedUser.displayName || 'New Match',
            recipientPhoto: match.matchedUser.photoURL || undefined,
        });
    }, [navigation]);

    // Filter conversations by search query
    const filteredConversations = searchQuery
        ? conversations.filter(c =>
            c.user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : conversations;

    // Render match item (horizontal scroll)
    const renderMatchItem = ({ item }: { item: Match }) => (
        <TouchableOpacity
            style={styles.matchItem}
            onPress={() => handleMatchPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.matchAvatar}>
                {item.matchedUser.photoURL ? (
                    <View style={styles.matchAvatarImageContainer}>
                        <Text style={styles.matchAvatarPlaceholder}>
                            {item.matchedUser.displayName?.charAt(0) || '?'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.matchAvatarImageContainer}>
                        <Text style={styles.matchAvatarPlaceholder}>
                            {item.matchedUser.displayName?.charAt(0) || '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.newMatchBadge} />
            </View>
            <Text style={styles.matchName} numberOfLines={1}>
                {item.matchedUser.displayName?.split(' ')[0] || 'New'}
            </Text>
        </TouchableOpacity>
    );

    // Render conversation item
    const renderConversationItem = ({ item }: { item: Conversation }) => (
        <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item)}
        />
    );

    // Item separator
    const ItemSeparator = () => <View style={styles.separator} />;

    // Render loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <LoadingSpinner message="Loading conversations..." />
            </SafeAreaView>
        );
    }

    // Render error state
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <EmptyState
                    emoji="😕"
                    title="Couldn't load messages"
                    message={error}
                    actionLabel="Try Again"
                    onAction={loadData}
                />
            </SafeAreaView>
        );
    }

    // Render empty state
    if (conversations.length === 0 && matches.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <EmptyState
                    emoji="💬"
                    title="No messages yet"
                    message="When you match with someone, you'll be able to chat here."
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor={colors.neutral[400]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* New Matches Section */}
            {matches.length > 0 && (
                <View style={styles.matchesSection}>
                    <Text style={styles.matchesSectionTitle}>New Matches</Text>
                    <FlatList
                        horizontal
                        data={matches}
                        renderItem={renderMatchItem}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.matchesList}
                    />
                </View>
            )}

            {/* Conversations List */}
            <FlatList
                data={filteredConversations}
                renderItem={renderConversationItem}
                keyExtractor={item => item.matchId}
                ItemSeparatorComponent={ItemSeparator}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadData(true)}
                        tintColor={colors.primary.DEFAULT}
                    />
                }
                ListEmptyComponent={
                    searchQuery ? (
                        <EmptyState
                            emoji="🔍"
                            title="No results"
                            message={`No conversations found for "${searchQuery}"`}
                        />
                    ) : null
                }
                contentContainerStyle={styles.conversationsList}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    searchContainer: {
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing[3],
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing[2],
    },
    searchInput: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.neutral[900],
        paddingVertical: spacing[3],
    },
    matchesSection: {
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    matchesSectionTitle: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: spacing[4],
        marginBottom: spacing[3],
    },
    matchesList: {
        paddingHorizontal: spacing[4],
    },
    matchItem: {
        alignItems: 'center',
        marginRight: spacing[4],
        width: 70,
    },
    matchAvatar: {
        position: 'relative',
        marginBottom: spacing[2],
    },
    matchAvatarImageContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary.DEFAULT,
    },
    matchAvatarPlaceholder: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    newMatchBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.background.light,
    },
    matchName: {
        fontSize: fontSize.sm,
        color: colors.neutral[700],
        textAlign: 'center',
    },
    conversationsList: {
        flexGrow: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border.light,
        marginLeft: spacing[4] + 56 + spacing[3], // avatar width + margin
    },
});
