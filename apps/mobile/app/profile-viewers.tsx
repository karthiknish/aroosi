import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Card, Avatar, Button } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { formatAge, formatCity } from "../utils/formatting";

interface ProfileViewer {
  id: string;
  fullName: string;
  age?: number;
  city?: string;
  profileImageUrl?: string;
  viewedAt: string;
  isMatch?: boolean;
}

export default function ProfileViewersScreen() {
  const apiClient = useApiClient();
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadViewers();
    checkPremiumStatus();
  }, []);

  const loadViewers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfileViewers();
      if (response.success && response.data) {
        setViewers(response.data.viewers || []);
      }
    } catch (error) {
      console.error("Error loading viewers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        const plan = response.data.subscriptionPlan;
        setIsPremium(plan === "premium" || plan === "premiumPlus");
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadViewers();
  };

  const handleViewProfile = (viewerId: string) => {
    router.push(`/profile/${viewerId}`);
  };

  const handleUpgradeToPremium = () => {
    router.push("/(tabs)/premium");
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const viewDate = new Date(dateString);
    const diffInMs = now.getTime() - viewDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return viewDate.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderViewer = (viewer: ProfileViewer) => (
    <TouchableOpacity
      key={viewer.id}
      style={styles.viewerCard}
      onPress={() => handleViewProfile(viewer.id)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={viewer.profileImageUrl}
        name={viewer.fullName}
        size="md"
      />
      <View style={styles.viewerInfo}>
        <View style={styles.viewerHeader}>
          <Text style={styles.viewerName}>{viewer.fullName}</Text>
          {viewer.isMatch && (
            <View style={styles.matchBadge}>
              <Ionicons name="heart" size={12} color={Colors.background.primary} />
              <Text style={styles.matchText}>Match</Text>
            </View>
          )}
        </View>
        <Text style={styles.viewerDetails}>
          {viewer.age && `${viewer.age} years old`}
          {viewer.age && viewer.city && " • "}
          {viewer.city}
        </Text>
        <Text style={styles.viewedTime}>{formatTimeAgo(viewer.viewedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
    </TouchableOpacity>
  );

  const renderPremiumPrompt = () => (
    <Card style={styles.premiumPromptCard}>
      <View style={styles.premiumPromptContent}>
        <View style={styles.premiumPromptIcon}>
          <Ionicons name="diamond" size={32} color={Colors.primary[500]} />
        </View>
        <Text style={styles.premiumPromptTitle}>Upgrade to See Who Viewed You</Text>
        <Text style={styles.premiumPromptText}>
          Discover who's interested in your profile with a Premium subscription.
        </Text>
        <Button
          title="Upgrade to Premium"
          onPress={handleUpgradeToPremium}
          style={styles.upgradeButton}
        />
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="eye-off-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No Profile Views Yet</Text>
      <Text style={styles.emptySubtitle}>
        When someone views your profile, they'll appear here.
      </Text>
    </View>
  );

  const renderBlurredViewers = () => (
    <View style={styles.blurredViewersContainer}>
      {[1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={styles.blurredViewer}>
          <View style={styles.blurredAvatar} />
          <View style={styles.blurredInfo}>
            <View style={styles.blurredName} />
            <View style={styles.blurredDetails} />
            <View style={styles.blurredTime} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Viewers</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!isPremium ? (
          <>
            {renderPremiumPrompt()}
            {renderBlurredViewers()}
          </>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading viewers...</Text>
          </View>
        ) : viewers.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Stats */}
            <Card style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{viewers.length}</Text>
                  <Text style={styles.statLabel}>Total Views</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {viewers.filter(v => v.isMatch).length}
                  </Text>
                  <Text style={styles.statLabel}>Mutual Matches</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {viewers.filter(v => {
                      const viewDate = new Date(v.viewedAt);
                      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                      return viewDate > oneDayAgo;
                    }).length}
                  </Text>
                  <Text style={styles.statLabel}>Last 24h</Text>
                </View>
              </View>
            </Card>

            {/* Viewers List */}
            <Card style={styles.viewersCard}>
              <View style={styles.viewersHeader}>
                <Text style={styles.viewersTitle}>Recent Viewers</Text>
                <Text style={styles.viewersSubtitle}>
                  People who have viewed your profile
                </Text>
              </View>
              
              <View style={styles.viewersList}>
                {viewers.map(renderViewer)}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
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
  
  headerTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  content: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Layout.spacing.xl * 2,
  },
  
  loadingText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  // Premium Prompt
  premiumPromptCard: {
    padding: Layout.spacing.xl,
    marginBottom: Layout.spacing.lg,
    alignItems: "center",
  },
  
  premiumPromptContent: {
    alignItems: "center",
  },
  
  premiumPromptIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  
  premiumPromptTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.md,
  },
  
  premiumPromptText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.relaxed,
    marginBottom: Layout.spacing.xl,
  },
  
  upgradeButton: {
    paddingHorizontal: Layout.spacing.xl,
  },
  
  // Blurred Viewers
  blurredViewersContainer: {
    gap: Layout.spacing.md,
  },
  
  blurredViewer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    opacity: 0.6,
  },
  
  blurredAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral[300],
    marginRight: Layout.spacing.md,
  },
  
  blurredInfo: {
    flex: 1,
    gap: Layout.spacing.sm,
  },
  
  blurredName: {
    height: 16,
    width: "60%",
    backgroundColor: Colors.neutral[300],
    borderRadius: Layout.radius.sm,
  },
  
  blurredDetails: {
    height: 12,
    width: "40%",
    backgroundColor: Colors.neutral[200],
    borderRadius: Layout.radius.sm,
  },
  
  blurredTime: {
    height: 12,
    width: "30%",
    backgroundColor: Colors.neutral[200],
    borderRadius: Layout.radius.sm,
  },
  
  // Stats Card
  statsCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  
  statNumber: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[500],
    marginBottom: Layout.spacing.xs,
  },
  
  statLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.primary,
  },
  
  // Viewers Card
  viewersCard: {
    padding: 0,
    overflow: "hidden",
  },
  
  viewersHeader: {
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  viewersTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  viewersSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  viewersList: {
    padding: 0,
  },
  
  // Viewer Item
  viewerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  viewerInfo: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },
  
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.xs,
  },
  
  viewerName: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginRight: Layout.spacing.sm,
  },
  
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.full,
    gap: Layout.spacing.xs,
  },
  
  matchText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  viewerDetails: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  
  viewedTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.neutral[400],
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl * 2,
    paddingHorizontal: Layout.spacing.lg,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  
  emptySubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
});