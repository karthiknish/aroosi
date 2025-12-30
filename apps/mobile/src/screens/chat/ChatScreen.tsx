/**
 * Chat Screen - Real-time messaging with a match
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'react-native-image-picker';
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
import { useAuthStore } from '../../store';
import { useRealTimeMessages, type MessageData } from '../../hooks/useRealTimeMessages';
import {
    markMessagesAsRead as markAsReadApi,
} from '../../services/api/messages';

interface ChatScreenProps {
    matchId: string;
    recipientName: string;
    recipientPhoto?: string;
    onBack?: () => void;
}

export default function ChatScreen({
    matchId,
    recipientName,
    recipientPhoto,
    onBack
}: ChatScreenProps) {
    const { user } = useAuthStore();
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    
    // Refs for debouncing and preventing duplicate API calls
    const markAsReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingReadIdsRef = useRef<Set<string>>(new Set());
    const lastSyncedIdsRef = useRef<Set<string>>(new Set());

    const {
        messages,
        isConnected,
        sendMessage: sendMessageFs,
        sendImageMessage: sendImageFs,
        fetchOlder,
        hasMore,
        loadingOlder,
        error,
        markAsRead,
    } = useRealTimeMessages({ conversationId: matchId });

    // Mark incoming messages as read - with debouncing to prevent excessive API calls
    useEffect(() => {
        if (messages.length === 0 || !user?.id) return;

        const unreadIds = messages
            .filter(m => m.toUserId === user.id && !m.isRead)
            .map(m => m.id)
            // Filter out already synced IDs
            .filter(id => !lastSyncedIdsRef.current.has(id));
        
        if (unreadIds.length === 0) return;

        // Add to pending set
        unreadIds.forEach(id => pendingReadIdsRef.current.add(id));

        // Mark read locally immediately
        markAsRead(unreadIds);

        // Debounce the API call to batch multiple updates
        if (markAsReadTimeoutRef.current) {
            clearTimeout(markAsReadTimeoutRef.current);
        }

        markAsReadTimeoutRef.current = setTimeout(() => {
            const idsToSync = Array.from(pendingReadIdsRef.current);
            if (idsToSync.length === 0) return;

            // Track synced IDs to prevent duplicates
            idsToSync.forEach(id => lastSyncedIdsRef.current.add(id));
            pendingReadIdsRef.current.clear();

            // Notify backend for unread count sync
            markAsReadApi(matchId).catch((err) => {
                console.error('Failed to sync read status:', err);
                // On failure, remove from synced so it can retry
                idsToSync.forEach(id => lastSyncedIdsRef.current.delete(id));
            });
        }, 500); // 500ms debounce

        return () => {
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
            }
        };
    }, [messages, user?.id, matchId, markAsRead]);


    // Send message
    const handleSend = useCallback(async () => {
        if (!inputText.trim() || sending || !user?.id) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            // Extract recipientId from matchId (it's user1_user2)
            const parts = matchId.split('_');
            const recipientId = parts.find(id => id !== user.id) || '';
            
            await sendMessageFs(messageText, recipientId);
        } catch (err) {
            console.error('Send error:', err);
            // Restore the message so user can retry
            setInputText(messageText);
            Alert.alert(
                'Message Failed',
                'Failed to send your message. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setSending(false);
        }
    }, [inputText, matchId, sending, user?.id, sendMessageFs]);

    // Handle image attachment
    const handleAttach = useCallback(async () => {
        if (sending || !user?.id) return;

        const result = await ImagePicker.launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
            return;
        }

        const asset = result.assets[0];
        if (!asset.uri) return;

        setSending(true);
        try {
            const parts = matchId.split('_');
            const recipientId = parts.find(id => id !== user.id) || '';
            await sendImageFs(asset.uri, recipientId);
        } catch (err) {
            console.error('Image send error:', err);
            Alert.alert(
                'Image Failed',
                'Failed to send the image. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setSending(false);
        }
    }, [matchId, sending, user?.id, sendImageFs]);

    // Format time
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Format date header
    const formatDateHeader = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    // Check if should show date header (for inverted list - compare with next item)
    const shouldShowDateHeader = (index: number) => {
        // In inverted list, index 0 is newest, so show header when date changes from next (older) message
        if (index === messages.length - 1) return true; // Always show for oldest message
        const currentDate = new Date(messages[index].createdAt).toDateString();
        const nextDate = new Date(messages[index + 1].createdAt).toDateString();
        return currentDate !== nextDate;
    };

    // Render message item
    const renderMessage = ({ item, index }: { item: MessageData; index: number }) => {
        const isMe = item.fromUserId === user?.id;
        const showDateHeader = shouldShowDateHeader(index);

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>
                            {formatDateHeader(item.createdAt)}
                        </Text>
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.myMessage : styles.theirMessage,
                    item.type === 'image' && styles.imageMessageBubble
                ]}>
                    {item.type === 'image' ? (
                        <Image
                            source={{ uri: item.mediaUrl }}
                            style={styles.messageImage}
                            contentFit="cover"
                        />
                    ) : (
                        <Text style={[
                            styles.messageText,
                            isMe ? styles.myMessageText : styles.theirMessageText
                        ]}>
                            {item.text}
                        </Text>
                    )}
                    <View style={styles.messageFooter}>
                        <Text style={[
                            styles.messageTime,
                            isMe ? styles.myMessageTime : styles.theirMessageTime
                        ]}>
                            {formatTime(item.createdAt)}
                        </Text>
                        {isMe && (
                            <Text style={styles.readStatus}>
                                {item.isRead ? ' ✓✓' : ' ✓'}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // Render loading state
    if (!isConnected && messages.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{recipientName}</Text>
                    <View style={styles.headerRight} />
                </View>
                <LoadingSpinner message="Connecting..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    {recipientPhoto ? (
                        <Image
                            source={{ uri: recipientPhoto }}
                            style={styles.headerAvatar}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.headerAvatarPlaceholder}>
                            <Text style={styles.headerAvatarText}>
                                {recipientName.charAt(0)}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.headerTitle}>{recipientName}</Text>
                </View>
                <TouchableOpacity style={styles.headerRight}>
                    <Text style={styles.moreIcon}>⋮</Text>
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {error ? (
                    <EmptyState
                        emoji="😕"
                        title="Couldn't load messages"
                        message={error}
                    />
                ) : messages.length === 0 ? (
                    <EmptyState
                        emoji="💬"
                        title="Start the conversation!"
                        message={`Send a message to ${recipientName} to begin chatting.`}
                    />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        inverted
                        onEndReached={fetchOlder}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingOlder ? (
                                <ActivityIndicator 
                                    size="small" 
                                    color={colors.primary.DEFAULT} 
                                    style={{ marginVertical: spacing[4] }} 
                                />
                            ) : null
                        }
                    />
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity 
                        style={styles.attachButton}
                        onPress={handleAttach}
                        disabled={sending}
                    >
                        <Text style={styles.attachIcon}>📎</Text>
                    </TouchableOpacity>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.neutral[400]}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                        />
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            inputText.trim() && styles.sendButtonActive
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || sending}
                    >
                        <Text style={[
                            styles.sendIcon,
                            inputText.trim() && styles.sendIconActive
                        ]}>
                            {sending ? '⏳' : '➤'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Responsive sizes
const HEADER_AVATAR_SIZE = isSmallDevice ? 32 : 36;
const SEND_BUTTON_SIZE = isSmallDevice ? 36 : 40;
const ATTACH_BUTTON_SIZE = isSmallDevice ? 36 : 40;
const ICEBREAKER_BADGE_SIZE = isSmallDevice ? 20 : 24;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.light,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        backgroundColor: colors.background.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        padding: moderateScale(8),
    },
    backIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[800],
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: moderateScale(8),
    },
    headerAvatar: {
        width: HEADER_AVATAR_SIZE,
        height: HEADER_AVATAR_SIZE,
        borderRadius: HEADER_AVATAR_SIZE / 2,
        marginRight: moderateScale(8),
    },
    headerAvatarPlaceholder: {
        width: HEADER_AVATAR_SIZE,
        height: HEADER_AVATAR_SIZE,
        borderRadius: HEADER_AVATAR_SIZE / 2,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(8),
    },
    headerAvatarText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary.DEFAULT,
    },
    headerTitle: {
        fontSize: responsiveFontSizes.lg,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerRight: {
        padding: moderateScale(8),
    },
    moreIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[600],
    },
    content: {
        flex: 1,
    },
    messagesList: {
        padding: responsiveValues.screenPadding,
        paddingBottom: moderateScale(8),
    },
    dateHeader: {
        alignItems: 'center',
        marginVertical: moderateScale(16),
    },
    dateHeaderText: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        backgroundColor: colors.neutral[100],
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(4),
        borderRadius: borderRadius.full,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: moderateScale(12),
        borderRadius: borderRadius.xl,
        marginBottom: moderateScale(8),
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary.DEFAULT,
        borderBottomRightRadius: moderateScale(4),
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: colors.neutral[100],
        borderBottomLeftRadius: moderateScale(4),
    },
    imageMessageBubble: {
        padding: moderateScale(4),
        width: moderateScale(240),
    },
    messageImage: {
        width: '100%',
        height: moderateScale(240),
        borderRadius: borderRadius.lg,
    },
    icebreakerBadge: {
        position: 'absolute',
        top: moderateScale(-8),
        right: moderateScale(-8),
        width: ICEBREAKER_BADGE_SIZE,
        height: ICEBREAKER_BADGE_SIZE,
        borderRadius: ICEBREAKER_BADGE_SIZE / 2,
        backgroundColor: colors.warning,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icebreakerIcon: {
        fontSize: moderateScale(12),
    },
    messageText: {
        fontSize: responsiveFontSizes.base,
        lineHeight: responsiveFontSizes.base * 1.4,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    theirMessageText: {
        color: colors.neutral[800],
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: moderateScale(4),
    },
    messageTime: {
        fontSize: responsiveFontSizes.xs,
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirMessageTime: {
        color: colors.neutral[400],
    },
    readStatus: {
        fontSize: moderateScale(10),
        color: 'rgba(255,255,255,0.7)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: moderateScale(12),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
        backgroundColor: colors.background.light,
    },
    attachButton: {
        width: ATTACH_BUTTON_SIZE,
        height: ATTACH_BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachIcon: {
        fontSize: moderateScale(20),
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.xl,
        paddingHorizontal: moderateScale(12),
        marginHorizontal: moderateScale(8),
        maxHeight: moderateScale(120),
    },
    input: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        paddingVertical: moderateScale(8),
    },
    sendButton: {
        width: SEND_BUTTON_SIZE,
        height: SEND_BUTTON_SIZE,
        borderRadius: SEND_BUTTON_SIZE / 2,
        backgroundColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: colors.primary.DEFAULT,
    },
    sendIcon: {
        fontSize: moderateScale(18),
        color: colors.neutral[400],
    },
    sendIconActive: {
        color: '#FFFFFF',
    },
});
