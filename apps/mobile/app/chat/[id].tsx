import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
// @ts-expect-error gift chat types
import { GiftedChat, IMessage, User } from "react-native-gifted-chat";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error clerk expo types
import { useUser } from "@clerk/clerk-expo";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Match, Message } from "../../types";
import { formatName } from "../../utils/formatting";
import { Avatar } from "../../components/ui";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useChatMessages } from "../../hooks/useMessaging";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const apiClient = useApiClient();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const chatRef = useRef<any>(null);
  
  // Use the messaging hook for real-time updates
  const { 
    messages: rawMessages, 
    sending, 
    sendMessage, 
    markAsRead 
  } = useChatMessages(id!);

  // Convert raw messages to GiftedChat format
  const giftedMessages = rawMessages.map((message) => ({
    _id: message.id,
    text: message.content,
    createdAt: new Date(message.createdAt),
    user: {
      _id: message.senderId,
      name: message.senderId === user?.id ? "You" : getOtherUserName(),
    },
  })).reverse(); // GiftedChat expects newest messages first

  useEffect(() => {
    if (id && user) {
      loadMatchData();
    }
  }, [id, user]);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (id && rawMessages.length > 0) {
      markAsRead(id);
    }
  }, [id, rawMessages.length, markAsRead]);

  const loadMatchData = async () => {
    try {
      setLoading(true);
      
      // Load match details
      const response = await apiClient.getMatches();
      if (response.success && response.data) {
        const matches = response.data.matches || response.data;
        const currentMatch = matches.find((m: Match) => m.id === id);
        if (currentMatch) {
          setMatch(currentMatch);
        }
      }
    } catch (error) {
      console.error("Error loading match data:", error);
      Alert.alert("Error", "Failed to load chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = () => {
    if (!match || !user) return null;
    
    if (match.user1Profile.id === user.id) {
      return match.user2Profile;
    }
    return match.user1Profile;
  };

  const getOtherUserName = () => {
    const otherUser = getOtherUser();
    return otherUser ? formatName(otherUser.fullName) : "User";
  };

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!newMessages.length || sending) return;

    const message = newMessages[0];
    
    try {
      await PlatformHaptics.light();

      // Send message using the hook
      const success = await sendMessage(id!, message.text);

      if (success) {
        await PlatformHaptics.success();
      } else {
        await PlatformHaptics.error();
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      await PlatformHaptics.error();
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  }, [id, sending, sendMessage]);

  const renderHeader = () => {
    const otherUser = getOtherUser();
    if (!otherUser) return null;

    return (
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${otherUser.id}`)}
        >
          <Avatar
            uri={otherUser.profileImageIds?.[0]}
            name={otherUser.fullName}
            size="sm"
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{formatName(otherUser.fullName)}</Text>
            <Text style={styles.userStatus}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="chatbubbles" size={48} color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error[400]} />
          <Text style={styles.errorTitle}>Chat not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser: User = {
    _id: user?.id || "",
    name: "You",
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <GiftedChat
          ref={chatRef}
          messages={giftedMessages}
          onSend={onSend}
          user={currentUser}
          placeholder="Type a message..."
          showUserAvatar={false}
          alwaysShowSend
          scrollToBottom
          scrollToBottomComponent={() => (
            <Ionicons name="chevron-down" size={20} color={Colors.primary[500]} />
          )}
          renderSend={(props) => (
            <TouchableOpacity
              style={[
                styles.sendButton,
                !props.text?.trim() && styles.sendButtonDisabled
              ]}
              onPress={() => {
                if (props.text?.trim() && props.onSend) {
                  props.onSend([{
                    _id: Math.random().toString(),
                    text: props.text.trim(),
                    createdAt: new Date(),
                    user: currentUser,
                  }], true);
                }
              }}
              disabled={!props.text?.trim() || sending}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={props.text?.trim() ? Colors.primary[500] : Colors.neutral[400]} 
              />
            </TouchableOpacity>
          )}
          textInputProps={{
            style: styles.textInput,
            multiline: true,
            maxLength: 1000,
          }}
          messagesContainerStyle={styles.messagesContainer}
          renderTime={() => null}
          renderDay={() => null}
          listViewProps={{
            style: styles.messagesList,
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  backButton: {
    padding: Layout.spacing.xs,
    marginRight: Layout.spacing.sm,
  },

  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  userStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  moreButton: {
    padding: Layout.spacing.xs,
    marginLeft: Layout.spacing.sm,
  },

  chatContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  messagesContainer: {
    backgroundColor: Colors.background.secondary,
  },

  messagesList: {
    backgroundColor: Colors.background.secondary,
  },

  textInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginRight: Layout.spacing.sm,
    minHeight: 40,
    maxHeight: 100,
  },

  sendButton: {
    backgroundColor: Colors.primary[50],
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },

  sendButtonDisabled: {
    backgroundColor: Colors.neutral[100],
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },

  loadingText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Layout.spacing.md,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },

  errorTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },

  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
});
