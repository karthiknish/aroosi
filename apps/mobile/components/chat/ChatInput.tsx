import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import VoiceRecorder from './VoiceRecorder';
import PlatformHaptics from '../../utils/PlatformHaptics';

interface ChatInputProps {
  conversationId: string;
  currentUserId: string;
  onSendMessage: (content: string, type: 'text') => void;
  onSendVoiceMessage: (uri: string, duration: number) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export default function ChatInput({
  conversationId,
  currentUserId,
  onSendMessage,
  onSendVoiceMessage,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 1000,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  
  const { startTyping, stopTyping } = useTypingIndicator(conversationId, currentUserId);

  const canSend = message.trim().length > 0 && !disabled;

  // Handle keyboard events
  React.useEffect(() => {
    const keyboardDidShow = () => setIsKeyboardVisible(true);
    const keyboardDidHide = () => setIsKeyboardVisible(false);

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardDidShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardDidHide
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
    
    if (text.trim().length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageToSend = message.trim();
    setMessage('');
    stopTyping();
    
    await PlatformHaptics.light();
    onSendMessage(messageToSend, 'text');
    
    // Focus input after sending
    inputRef.current?.focus();
  }, [canSend, message, stopTyping, onSendMessage]);

  const handleVoicePress = useCallback(async () => {
    await PlatformHaptics.light();
    
    if (message.trim().length > 0) {
      // If there's text, send it first
      handleSend();
    } else {
      // Show voice recorder
      Keyboard.dismiss();
      setShowVoiceRecorder(true);
    }
  }, [message, handleSend]);

  const handleVoiceRecordingComplete = useCallback(async (uri: string, duration: number) => {
    setShowVoiceRecorder(false);
    await PlatformHaptics.success();
    onSendVoiceMessage(uri, duration);
  }, [onSendVoiceMessage]);

  const handleVoiceRecordingCancel = useCallback(() => {
    setShowVoiceRecorder(false);
  }, []);

  const handleInputFocus = useCallback(() => {
    stopTyping(); // Stop typing when user starts typing
  }, [stopTyping]);

  const handleInputBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  return (
    <>
      <View style={[
        styles.container,
        isKeyboardVisible && styles.keyboardVisible,
      ]}>
        <View style={styles.inputContainer}>
          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={message}
              onChangeText={handleTextChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              placeholderTextColor={Colors.text.tertiary}
              multiline
              maxLength={maxLength}
              editable={!disabled}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            
            {/* Character Count */}
            {message.length > maxLength * 0.8 && (
              <View style={styles.characterCount}>
                <Text style={[
                  styles.characterCountText,
                  message.length >= maxLength && styles.characterCountError
                ]}>
                  {message.length}/{maxLength}
                </Text>
              </View>
            )}
          </View>

          {/* Send/Voice Button */}
          <View style={styles.actionButtons}>
            {canSend ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.sendButton]}
                onPress={handleSend}
                disabled={disabled}
              >
                <Ionicons name="send" size={20} color={Colors.background.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.voiceButton]}
                onPress={handleVoicePress}
                disabled={disabled}
                delayLongPress={200}
              >
                <Ionicons name="mic" size={20} color={Colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Input Helpers */}
        {disabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>
              You can't send messages in this conversation
            </Text>
          </View>
        )}
      </View>

      {/* Voice Recorder Overlay */}
      <VoiceRecorder
        visible={showVoiceRecorder}
        onRecordingComplete={handleVoiceRecordingComplete}
        onCancel={handleVoiceRecordingCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },

  keyboardVisible: {
    paddingBottom: Layout.spacing.md,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Layout.spacing.sm,
  },

  textInputContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 44,
    maxHeight: 120,
    position: 'relative',
  },

  textInput: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    lineHeight: 20,
    maxHeight: 80,
  },

  characterCount: {
    position: 'absolute',
    bottom: Layout.spacing.xs,
    right: Layout.spacing.sm,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },

  characterCountText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },

  characterCountError: {
    color: Colors.error[500],
  },

  actionButtons: {
    alignItems: 'flex-end',
  },

  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  sendButton: {
    backgroundColor: Colors.primary[500],
  },

  voiceButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },

  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.radius.md,
  },

  disabledText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});