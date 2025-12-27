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
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
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
import { ConversationItem } from '../../components/ConversationItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { type Conversation } from '../../services/api/messages';
import { type Match } from '../../services/api/matches';
import { useRealTimeConversations } from '../../hooks/useRealTimeConversations';

type MessagesNavigation = NativeStackNavigationProp<MessagesStackParamList, 'MessagesMain'>;

export default function MessagesScreen() {
    const navigation = useNavigation<MessagesNavigation>();
    const { conversations, loading, error: rtError } = useRealTimeConversations();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter conversations that have messages
    const activeConversations = conversations.filter(c => c.lastMessage);
    
    // Filter matches that don't have conversations yet
    const newMatches = conversations
        .filter(c => !c.lastMessage)
        .map(c => ({
            id: c.matchId,
            matchedUser: {
                id: c.userId,
                displayName: c.user?.displayName,
                photoURL: c.user?.photoURL,
            },
            status: 'matched' as const,
            createdAt: c.updatedAt,
        }));

    // Handle conversation press
    const handleConversationPress = useCallback((conversation: Conversation) => {
        navigation.navigate('Chat', {
            matchId: conversation.matchId,
            recipientName: conversation.user?.displayName || 'Unknown',
            recipientPhoto: conversation.user?.photoURL || undefined,
        });
    }, [navigation]);

    // Handle new match press
    const handleMatchPress = useCallback((match: any) => {
        navigation.navigate('Chat', {
            matchId: match.id,
            recipientName: match.matchedUser.displayName || 'New Match',
            recipientPhoto: match.matchedUser.photoURL || undefined,
        });
    }, [navigation]);

    // Filter conversations by search query
    const filteredConversations = searchQuery
        ? activeConversations.filter(c =>
            c.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : activeConversations;

    // Render match item (horizontal scroll)
    const renderMatchItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.matchItem}
            onPress={() => handleMatchPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.matchAvatar}>
                <View style={styles.matchAvatarImageContainer}>
                    {item.matchedUser.photoURL ? (
                        <Image
                            source={{ uri: item.matchedUser.photoURL }}
                            style={styles.matchAvatarImage}
                            contentFit="cover"
                        />
                    ) : (
                        <Text style={styles.matchAvatarPlaceholder}>
                            {item.matchedUser.displayName?.charAt(0) || '?'}
                        </Text>
                    )}
                </View>
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
    if (loading && conversations.length === 0) {
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
    if (rtError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <EmptyState
                    emoji="😕"
                    title="Couldn't load messages"
                    message={rtError.message}
                />
            </SafeAreaView>
        );
    }

    // Render empty state
    if (conversations.length === 0) {
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
            {newMatches.length > 0 && (
                <View style={styles.matchesSection}>
                    <Text style={styles.matchesSectionTitle}>New Matches</Text>
                    <FlatList
                        horizontal
                        data={newMatches}
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

// Responsive avatar sizes
const MATCH_AVATAR_SIZE = isSmallDevice ? 56 : 64;
const MATCH_ITEM_WIDTH = isSmallDevice ? 60 : 70;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    title: {
        fontSize: responsiveFontSizes.xl,
        fontWeight: fontWeight.bold,
        color: colors.neutral[900],
    },
    searchContainer: {
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        paddingHorizontal: moderateScale(12),
    },
    searchIcon: {
        fontSize: moderateScale(16),
        marginRight: moderateScale(8),
    },
    searchInput: {
        flex: 1,
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        paddingVertical: moderateScale(12),
    },
    matchesSection: {
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    matchesSectionTitle: {
        fontSize: responsiveFontSizes.sm,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: responsiveValues.screenPadding,
        marginBottom: moderateScale(12),
    },
    matchesList: {
        paddingHorizontal: responsiveValues.screenPadding,
    },
    matchItem: {
        alignItems: 'center',
        marginRight: moderateScale(16),
        width: MATCH_ITEM_WIDTH,
    },
    matchAvatar: {
        position: 'relative',
        marginBottom: moderateScale(8),
    },
    matchAvatarImageContainer: {
        width: MATCH_AVATAR_SIZE,
        height: MATCH_AVATAR_SIZE,
        borderRadius: MATCH_AVATAR_SIZE / 2,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary.DEFAULT,
        overflow: 'hidden',
    },
    matchAvatarImage: {
        width: '100%',
        height: '100%',
    },
    matchAvatarPlaceholder: {
        fontSize: responsiveFontSizes['2xl'],
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    newMatchBadge: {
        position: 'absolute',
        bottom: moderateScale(2),
        right: moderateScale(2),
        width: moderateScale(16),
        height: moderateScale(16),
        borderRadius: moderateScale(8),
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.background.light,
    },
    matchName: {
        fontSize: responsiveFontSizes.sm,
        color: colors.neutral[700],
        textAlign: 'center',
    },
    conversationsList: {
        flexGrow: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border.light,
        marginLeft: responsiveValues.screenPadding + responsiveValues.avatarSmall + moderateScale(12),
    },
});
