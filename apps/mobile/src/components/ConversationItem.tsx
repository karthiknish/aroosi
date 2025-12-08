/**
 * ConversationItem Component
 * A list item for displaying conversation previews
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Conversation } from '../services/api/messages';

interface ConversationItemProps {
    conversation: Conversation;
    onPress?: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
    const { user, lastMessage, unreadCount, updatedAt } = conversation;

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    // Get message preview text
    const getMessagePreview = () => {
        if (!lastMessage) return 'Start a conversation!';

        switch (lastMessage.type) {
            case 'image':
                return '📷 Photo';
            case 'audio':
                return '🎤 Voice message';
            case 'gif':
                return 'GIF';
            case 'icebreaker':
                return `💡 ${lastMessage.content}`;
            default:
                return lastMessage.content;
        }
    };

    const hasUnread = unreadCount > 0;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {user.photoURL ? (
                    <Image
                        source={{ uri: user.photoURL }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {user.displayName?.charAt(0) || '?'}
                        </Text>
                    </View>
                )}
                {/* Online indicator could go here */}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
                        {user.displayName || 'Unknown'}
                    </Text>
                    <Text style={[styles.time, hasUnread && styles.timeUnread]}>
                        {formatTime(lastMessage?.createdAt || updatedAt)}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <Text
                        style={[styles.message, hasUnread && styles.messageUnread]}
                        numberOfLines={1}
                    >
                        {getMessagePreview()}
                    </Text>
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        backgroundColor: colors.background.light,
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
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
    },
    content: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[1],
    },
    name: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.neutral[800],
        marginRight: spacing[2],
    },
    nameBold: {
        fontWeight: fontWeight.semibold,
    },
    time: {
        fontSize: fontSize.xs,
        color: colors.neutral[400],
    },
    timeUnread: {
        color: colors.primary.DEFAULT,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    message: {
        flex: 1,
        fontSize: fontSize.sm,
        color: colors.neutral[500],
        marginRight: spacing[2],
    },
    messageUnread: {
        color: colors.neutral[700],
        fontWeight: fontWeight.medium,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary.DEFAULT,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing[1],
    },
    unreadCount: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: '#FFFFFF',
    },
});
