import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Card, Avatar } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Match } from "../../types";
import { formatTimeAgo, formatName } from "../../utils/formatting";

export default function MatchesScreen() {
  const apiClient = useApiClient();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const response = await apiClient.getMatches();
      if (response.success && response.data) {
        setMatches(response.data);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  const handleMatchPress = (match: Match) => {
    router.push({
      pathname: "/chat",
      params: { matchId: match.id },
    });
  };

  const getOtherUserProfile = (match: Match) => {
    // TODO: Get current user ID and return the other user's profile
    return match.user1Profile; // Placeholder
  };

  const renderMatch = ({ item: match }: { item: Match }) => {
    const otherUser = getOtherUserProfile(match);
    const primaryImage = otherUser.profileImageIds?.[0];
    const hasUnread = match.unreadCount && match.unreadCount > 0;

    return (
      <TouchableOpacity
        onPress={() => handleMatchPress(match)}
        activeOpacity={0.7}
      >
        <Card style={styles.matchCard} variant="outlined">
          <View style={styles.matchContent}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={primaryImage}
                name={otherUser.fullName}
                size="lg"
                online={false} // TODO: Add online status
              />
              {hasUnread && <View style={styles.unreadIndicator} />}
            </View>

            <View style={styles.matchInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.matchName}>
                  {formatName(otherUser.fullName)}
                </Text>
                {match.lastActivity && (
                  <Text style={styles.timeAgo}>
                    {formatTimeAgo(match.lastActivity)}
                  </Text>
                )}
              </View>

              <Text style={styles.lastMessage} numberOfLines={1}>
                {hasUnread
                  ? `${match.unreadCount} new message${match.unreadCount > 1 ? "s" : ""}`
                  : "Start a conversation..."}
              </Text>
            </View>

            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.neutral[400]}
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySubtitle}>
        Keep swiping to find your perfect match!
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() => router.push("/(tabs)/search")}
        activeOpacity={0.7}
      >
        <Text style={styles.discoverButtonText}>Start Discovering</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Matches</Text>
      {matches.length > 0 && (
        <Text style={styles.headerSubtitle}>
          {matches.length} match{matches.length !== 1 ? "es" : ""}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {matches.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary[500]]}
              tintColor={Colors.primary[500]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  headerTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  
  headerSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  listContainer: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  
  matchCard: {
    padding: Layout.spacing.md,
  },
  
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  avatarContainer: {
    position: "relative",
  },
  
  unreadIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary[500],
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  
  matchInfo: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },
  
  nameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Layout.spacing.xs,
  },
  
  matchName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  timeAgo: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  
  lastMessage: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  chevronContainer: {
    marginLeft: Layout.spacing.sm,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  
  emptySubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Layout.spacing.xl,
  },
  
  discoverButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  
  discoverButtonText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
});