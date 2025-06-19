import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Colors, Layout } from '../../constants';
import { useApiClient } from '../../utils/api';
import {
  ChatInput,
  TypingIndicator,
  VoiceMessage,
  useTypingIndicator,
  useMessageStatus,
  Message,
} from '../../components/chat';
import { LoadingState, RetryableComponent } from '../../components/error';

export default function EnhancedChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const apiClient = useApiClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Communication hooks
  const { typingState, getTypingText } = useTypingIndicator(
    conversationId || '',
    userId || ''
  );
  
  const {
    markAsRead,
    markAsDelivered,
    updateMessageStatus,
    isMessageRead,
  } = useMessageStatus(conversationId || '', userId || '');

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getMessages(conversationId);
      
      if (response.success && response.data) {
        const messagesList = response.data.messages || [];
        setMessages(messagesList);

        // Mark messages as delivered
        const undeliveredMessages = messagesList.filter(
          (msg: Message) => msg.senderId !== userId && msg.status !== 'delivered' && msg.status !== 'read'
        );
        
        undeliveredMessages.forEach((msg: Message) => {
          markAsDelivered(msg.id);
        });
      } else {
        setError(response.error || 'Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, apiClient, userId, markAsDelivered]);

  // Load messages on mount and conversation change
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Send text message
  const handleSendMessage = useCallback(async (content: string, type: 'text') => {
    if (!conversationId || !userId) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: userId,
      content,
      type,
      timestamp: Date.now(),
      status: 'sending',
    };

    // Add message optimistically
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await apiClient.sendMessage(conversationId, content);
      
      if (response.success && response.data) {
        // Replace temp message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...response.data.message, status: 'sent' }
              : msg
          )
        );
        updateMessageStatus(response.data.message.id, 'sent');
      } else {
        // Mark as failed
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  }, [conversationId, userId, apiClient, updateMessageStatus]);

  // Send voice message
  const handleSendVoiceMessage = useCallback(async (uri: string, duration: number) => {
    if (!conversationId || !userId) return;

    const tempMessage: Message = {
      id: `temp-voice-${Date.now()}`,
      conversationId,
      senderId: userId,
      content: '',
      type: 'voice',
      timestamp: Date.now(),
      status: 'sending',
      voiceUrl: uri,
      voiceDuration: duration,
    };

    // Add message optimistically
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Convert URI to blob for upload
      const response = await fetch(uri);
      const audioBlob = await response.blob();

      const uploadResponse = await apiClient.uploadVoiceMessage(
        audioBlob,
        conversationId,
        duration
      );
      
      if (uploadResponse.success && uploadResponse.data) {
        // Replace temp message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { 
                  ...uploadResponse.data.message, 
                  status: 'sent',
                  voiceUrl: uploadResponse.data.voiceUrl,
                }
              : msg
          )
        );
        updateMessageStatus(uploadResponse.data.message.id, 'sent');
      } else {
        // Mark as failed
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      
      // Mark as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  }, [conversationId, userId, apiClient, updateMessageStatus]);

  // Mark message as read when it becomes visible
  const handleMessageVisible = useCallback((message: Message) => {
    if (message.senderId !== userId && message.status !== 'read') {
      markAsRead(message.id);
    }
  }, [userId, markAsRead]);

  // Render message item
  const renderMessage = useCallback(({ item: message }: { item: Message }) => {
    const isOwnMessage = message.senderId === userId;

    if (message.type === 'voice') {
      return (
        <VoiceMessage
          message={message}
          isOwnMessage={isOwnMessage}
          showStatus={isOwnMessage}
        />
      );
    }

    // Regular text message rendering would go here
    return null;
  }, [userId]);

  if (loading) {
    return <LoadingState fullScreen message="Loading conversation..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <RetryableComponent
          loading={loading}
          error={error ? new Error(error) : null}
          onRetry={loadMessages}
          canRetry={true}
        >
          {/* Messages List */}
          <FlatList
            style={styles.messagesList}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            onEndReached={() => {
              // Load more messages
            }}
            onEndReachedThreshold={0.1}
            inverted
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={({ viewableItems }) => {
              // Mark visible messages as read
              viewableItems.forEach(({ item }) => {
                handleMessageVisible(item);
              });
            }}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50,
            }}
            ListFooterComponent={
              typingState.isTyping ? (
                <TypingIndicator
                  text={getTypingText()}
                  visible={typingState.isTyping}
                />
              ) : null
            }
          />

          {/* Chat Input */}
          <ChatInput
            conversationId={conversationId || ''}
            currentUserId={userId || ''}
            onSendMessage={handleSendMessage}
            onSendVoiceMessage={handleSendVoiceMessage}
            placeholder="Type a message..."
            disabled={!conversationId || !userId}
          />
        </RetryableComponent>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  content: {
    flex: 1,
  },

  messagesList: {
    flex: 1,
    paddingHorizontal: Layout.spacing.md,
  },
});