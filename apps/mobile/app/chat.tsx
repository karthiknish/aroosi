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
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
    FadeIn,
    FadeInUp,
    FadeInDown,
    SlideInRight,
    SlideInLeft,
} from 'react-native-reanimated';
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
} from '@/theme';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store';
import { useRealTimeMessages, type MessageData } from '@/hooks/useRealTimeMessages';
import { useAsyncActions } from '@/hooks/useAsyncAction';
import { useOffline } from '@/hooks/useOffline';

const AnimatedView = Animated.View;

const AVATAR_SIZE = isSmallDevice ? 36 : 40;

export default function ChatScreen() {
    const { matchId, recipientName, recipientPhoto } = useLocalSearchParams<{
        matchId: string;
        recipientName: string;
        recipientPhoto?: string;
    }>();

    const { user } = useAuthStore();
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const markAsReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingReadIdsRef = useRef<Set<string>>(new Set());
    const lastSyncedIdsRef = useRef<Set<string>>(new Set());

    const { checkNetworkOrAlert } = useOffline();

    const {
        messages,
        isConnected,
        sendMessage: sendMessageFs,
        sendImageMessage: sendImageFs,
        fetchOlder,
        hasMore,
        loadingOlder,
    } = useRealTimeMessages({ conversationId: matchId });

    // Extract recipient userId from matchId (format: "userA_userB" sorted)
    const recipientId = matchId.split('_').find(id => id !== user?.id) || matchId;

    const actions = useAsyncActions({
        sendMessage: async () => {
            if (!inputText.trim()) return;
            const text = inputText.trim();
            setInputText('');
            await sendMessageFs(text, recipientId);
        },
        sendImage: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                if (asset.uri) {
                    await sendImageFs(asset.uri, recipientId);
                }
            }
        },
    }, { errorMode: 'silent', networkAware: true });

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    // Mark messages as read
    useEffect(() => {
        const unreadIds = messages
            .filter(m => m.fromUserId !== user?.id && !m.isRead)
            .map(m => m.id);

        if (unreadIds.length > 0) {
            unreadIds.forEach(id => pendingReadIdsRef.current.add(id));

            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
            }

            markAsReadTimeoutRef.current = setTimeout(async () => {
                const idsToMark = Array.from(pendingReadIdsRef.current);
                if (idsToMark.length > 0) {
                    try {
                        const { markMessagesAsRead } = await import('@/services/api/messages');
                        await markMessagesAsRead(matchId);
                        lastSyncedIdsRef.current = new Set([...lastSyncedIdsRef.current, ...idsToMark]);
                        idsToMark.forEach(id => pendingReadIdsRef.current.delete(id));
                    } catch (err) {
                        console.error('Failed to mark messages as read:', err);
                    }
                }
            }, 500);
        }

        return () => {
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
            }
        };
    }, [messages, matchId, user?.id]);

    const handleBack = useCallback(() => {
        router.back();
    }, []);

    const handleSend = useCallback(() => {
        if (!checkNetworkOrAlert(() => handleSend())) return;
        actions.execute.sendMessage();
    }, [inputText, checkNetworkOrAlert, actions.execute]);

    const handleImage = useCallback(() => {
        if (!checkNetworkOrAlert(() => handleImage())) return;
        actions.execute.sendImage();
    }, [checkNetworkOrAlert, actions.execute]);

    const handleLoadOlder = useCallback(() => {
        if (!loadingOlder && hasMore) {
            fetchOlder();
        }
    }, [fetchOlder, hasMore, loadingOlder]);

    const renderMessage = useCallback(({ item, index }: { item: MessageData; index: number }) => {
        const isMe = item.fromUserId === user?.id;
        const showAvatar = !isMe && item.fromUserId === messages[messages.indexOf(item) - 1]?.fromUserId;
        // Use a small delay based on index for staggered animation
        const delay = Math.min(index * 50, 300);

        return (
            <AnimatedView
                style={[styles.messageRow, isMe && styles.messageRowMe]}
                entering={isMe
                    ? SlideInRight.duration(350).delay(delay)
                    : SlideInLeft.duration(350).delay(delay)
                }
            >
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {recipientPhoto ? (
                            <Image source={{ uri: recipientPhoto }} style={styles.avatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>{recipientName?.charAt(0) || '?'}</Text>
                            </View>
                        )}
                    </View>
                )}
                <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
                    <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                </View>
            </AnimatedView>
        );
    }, [user?.id, recipientPhoto, recipientName, messages]);

    const renderListHeader = useCallback(() => {
        if (!hasMore) return null;
        return (
            <View style={styles.loadingOlder}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            </View>
        );
    }, [hasMore]);

    if (!isConnected) {
        return <LoadingSpinner message="Connecting..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <AnimatedView
                style={styles.header}
                entering={FadeInDown.duration(400)}
            >
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                {recipientPhoto ? (
                    <Image source={{ uri: recipientPhoto }} style={styles.headerAvatar} contentFit="cover" />
                ) : (
                    <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>{recipientName?.charAt(0) || '?'}</Text>
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{recipientName}</Text>
                    <Text style={styles.headerStatus}>Online</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreIcon}>⋯</Text>
                </TouchableOpacity>
            </AnimatedView>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContent}
                onEndReached={handleLoadOlder}
                onEndReachedThreshold={0.1}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            Say hi to {recipientName}! 👋
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            <AnimatedView entering={FadeInUp.duration(400)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.attachButton}
                            onPress={handleImage}
                            disabled={actions.loading.sendImage}
                        >
                            {actions.loading.sendImage ? (
                                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                            ) : (
                                <Text style={styles.attachIcon}>📷</Text>
                            )}
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.neutral[400]}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={actions.loading.sendMessage || !inputText.trim()}
                        >
                            {actions.loading.sendMessage ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.sendButtonText}>➤</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </AnimatedView>
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
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        minHeight: responsiveValues.headerHeight,
    },
    backButton: {
        width: moderateScale(40),
        height: moderateScale(40),
    },
    backButtonText: {
        fontSize: moderateScale(28),
        color: colors.neutral[800],
    },
    headerAvatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        marginRight: moderateScale(12),
    },
    avatarPlaceholder: {
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.bold,
        color: colors.primary.DEFAULT,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: responsiveFontSizes.base,
        fontWeight: fontWeight.semibold,
        color: colors.neutral[900],
    },
    headerStatus: {
        fontSize: responsiveFontSizes.xs,
        color: colors.success,
    },
    moreButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreIcon: {
        fontSize: moderateScale(24),
        color: colors.neutral[400],
    },
    messagesContent: {
        padding: responsiveValues.screenPadding,
        flexGrow: 1,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: moderateScale(12),
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },
    avatarContainer: {
        marginRight: moderateScale(8),
    },
    avatar: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
    },
    messageBubble: {
        maxWidth: '75%',
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        padding: moderateScale(12),
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    messageBubbleMe: {
        backgroundColor: colors.primary.DEFAULT,
    },
    messageText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        lineHeight: responsiveFontSizes.base * 1.4,
    },
    messageTextMe: {
        color: '#FFFFFF',
    },
    messageTime: {
        fontSize: responsiveFontSizes.xs,
        color: colors.neutral[400],
        marginTop: moderateScale(4),
        textAlign: 'right',
    },
    messageTimeMe: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    loadingOlder: {
        padding: moderateScale(8),
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(40),
    },
    emptyText: {
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[400],
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: responsiveValues.screenPadding,
        paddingVertical: moderateScale(12),
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
        backgroundColor: '#FFFFFF',
    },
    attachButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(8),
    },
    attachIcon: {
        fontSize: moderateScale(20),
    },
    input: {
        flex: 1,
        backgroundColor: colors.neutral[100],
        borderRadius: borderRadius.lg,
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(10),
        fontSize: responsiveFontSizes.base,
        color: colors.neutral[900],
        maxHeight: moderateScale(100),
    },
    sendButton: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: colors.primary.DEFAULT,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: moderateScale(8),
    },
    sendButtonDisabled: {
        backgroundColor: colors.neutral[300],
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: responsiveFontSizes.lg,
    },
});
