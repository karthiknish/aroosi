import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { Message, Match } from "../types";
import { formatMessageTime, formatName } from "../utils/formatting";

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const apiClient = useApiClient();
  const flatListRef = useRef<FlatList>(null);
  
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (matchId) {
      loadChatData();
    }
  }, [matchId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      
      // TODO: Load match data and messages
      // For now, using placeholder data
      const mockMatch: Match = {
        id: matchId,
        user1Id: "user1",
        user2Id: "user2",
        user1Profile: {
          id: "profile1",
          fullName: "Sarah Johnson",
          dateOfBirth: "1995-03-15",
          gender: "female",
          ukCity: "London",
          aboutMe: "Love traveling and photography",
          occupation: "Marketing Manager",
          education: "bachelors",
          height: "5'6\"",
          maritalStatus: "single",
          smoking: "no",
          drinking: "occasionally",
          profileImageIds: [],
          isProfileComplete: true,
          profileFor: "self",
          religion: "",
          createdAt: "",
          updatedAt: "",
        },
        user2Profile: {
          id: "profile2",
          fullName: "Current User",
          dateOfBirth: "1992-07-20",
          gender: "male",
          ukCity: "Manchester",
          aboutMe: "Software developer who loves hiking",
          occupation: "Software Developer",
          education: "masters",
          height: "5'10\"",
          maritalStatus: "single",
          smoking: "no",
          drinking: "no",
          profileImageIds: [],
          isProfileComplete: true,
          profileFor: "self",
          religion: "",
          createdAt: "",
          updatedAt: "",
        },
        status: "matched",
        createdAt: new Date().toISOString(),
      };

      const mockMessages: Message[] = [
        {
          id: "1",
          conversationId: matchId,
          senderId: "user1",
          receiverId: "user2",
          content: "Hi! Thanks for the like 😊",
          type: "text",
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "2",
          conversationId: matchId,
          senderId: "user2",
          receiverId: "user1",
          content: "Hello! I loved your profile, especially your travel photos!",
          type: "text",
          isRead: true,
          createdAt: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: "3",
          conversationId: matchId,
          senderId: "user1",
          receiverId: "user2",
          content: "Thank you! I see you're into hiking. What's your favorite trail?",
          type: "text",
          isRead: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ];

      setMatch(mockMatch);
      setMessages(mockMessages);
      
    } catch (error) {
      console.error("Error loading chat data:", error);
      Alert.alert("Error", "Failed to load chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !matchId) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // Optimistically add message to UI
      const tempMessage: Message = {
        id: Date.now().toString(),
        conversationId: matchId,
        senderId: "user2", // Current user
        receiverId: "user1", // Other user
        content: messageText,
        type: "text",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, tempMessage]);

      // Send message to API
      const response = await apiClient.sendMessage(matchId, messageText);
      
      if (!response.success) {
        // Remove optimistic message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getOtherUserProfile = () => {
    if (!match) return null;
    // TODO: Determine current user and return other user's profile
    return match.user1Profile;
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isCurrentUser = message.senderId === "user2"; // TODO: Use actual current user ID
    const otherUser = getOtherUserProfile();

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && otherUser && (
          <Avatar
            uri={otherUser.profileImageIds?.[0]}
            name={otherUser.fullName}
            size="sm"
            style={styles.messageAvatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.content}
          </Text>
        </View>
        
        <Text style={styles.messageTime}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    const otherUser = getOtherUserProfile();
    if (!otherUser) return null;

    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => {
            router.push({
              pathname: "/profile-detail",
              params: { profileId: otherUser.id },
            });
          }}
        >
          <Avatar
            uri={otherUser.profileImageIds?.[0]}
            name={otherUser.fullName}
            size="md"
            online={false} // TODO: Add online status
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {formatName(otherUser.fullName)}
            </Text>
            <Text style={styles.headerStatus}>
              Online now {/* TODO: Show actual status */}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Start the conversation!</Text>
      <Text style={styles.emptySubtitle}>
        Say hello and get to know each other
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesContainer,
            messages.length === 0 && styles.emptyMessagesContainer
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />
        
        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons
                name={sending ? "hourglass" : "send"}
                size={20}
                color={
                  newMessage.trim() && !sending
                    ? Colors.primary[500]
                    : Colors.neutral[400]
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  
  backButton: {
    padding: Layout.spacing.sm,
    marginRight: Layout.spacing.xs,
  },
  
  profileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  
  headerInfo: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  headerName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  headerStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.success[500],
    marginTop: Layout.spacing.xs,
  },
  
  moreButton: {
    padding: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  
  chatContainer: {
    flex: 1,
  },
  
  messagesContainer: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: "center",
  },
  
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  emptySubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Layout.spacing.sm,
  },
  
  currentUserMessage: {
    justifyContent: "flex-end",
    marginLeft: "20%",
  },
  
  otherUserMessage: {
    justifyContent: "flex-start",
    marginRight: "20%",
  },
  
  messageAvatar: {
    marginRight: Layout.spacing.sm,
  },
  
  messageBubble: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.lg,
    maxWidth: "80%",
  },
  
  currentUserBubble: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: Layout.radius.xs,
  },
  
  otherUserBubble: {
    backgroundColor: Colors.neutral[100],
    borderBottomLeftRadius: Layout.radius.xs,
  },
  
  messageText: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
  },
  
  currentUserText: {
    color: Colors.text.inverse,
  },
  
  otherUserText: {
    color: Colors.text.primary,
  },
  
  messageTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Layout.spacing.xs,
    alignSelf: "center",
    marginHorizontal: Layout.spacing.sm,
  },
  
  inputContainer: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.neutral[50],
    borderRadius: Layout.radius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 44,
  },
  
  textInput: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    maxHeight: 100,
    textAlignVertical: "center",
  },
  
  sendButton: {
    padding: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
  },
  
  sendButtonDisabled: {
    opacity: 0.5,
  },
});