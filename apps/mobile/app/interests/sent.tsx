import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error clerk expo types
import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Interest } from "../../types";
import { formatTimeAgo, formatName } from "../../utils/formatting";
import { Avatar, Button } from "../../components/ui";
import PlatformCard from "../../components/ui/PlatformCard";
import PlatformHaptics from "../../utils/PlatformHaptics";

export default function SentInterests() {
  const { user } = useUser();
  const apiClient = useApiClient();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadSentInterests();
  }, []);

  const loadSentInterests = async () => {
    if (!user) return;

    try {
      const response = await apiClient.getSentInterests(user.id);
      if (response.success && response.data) {
        setInterests(response.data.interests || response.data);
      }
    } catch (error) {
      console.error("Error loading sent interests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSentInterests();
    setRefreshing(false);
  };

  const handleRemoveInterest = async (interest: Interest) => {
    if (removing || interest.status !== 'sent') return;

    Alert.alert(
      "Remove Interest",
      `Are you sure you want to remove your interest in ${formatName(interest.toProfile.fullName)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemoving(interest.id);
              await PlatformHaptics.medium();

              const result = await apiClient.removeInterest(interest.toUserId, user!.id);

              if (result.success) {
                await PlatformHaptics.success();
                
                // Remove from local state
                setInterests(prev => prev.filter(item => item.id !== interest.id));
                
                Alert.alert("Interest Removed", "Your interest has been removed.");
              } else {
                await PlatformHaptics.error();
                Alert.alert("Error", result.error || "Failed to remove interest");
              }
            } catch (error) {
              console.error("Error removing interest:", error);
              await PlatformHaptics.error();
              Alert.alert("Error", "Failed to remove interest. Please try again.");
            } finally {
              setRemoving(null);
            }
          }
        },
      ]
    );
  };

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };

  const handleStartChat = (interest: Interest) => {
    // Navigate to matches to find the conversation
    router.push("/(tabs)/matches");
  };

  const renderInterest = ({ item: interest }: { item: Interest }) => {
    const profile = interest.toProfile;
    const primaryImage = profile.profileImageIds?.[0];
    const isPending = interest.status === 'sent';
    const isMatched = interest.status === 'matched';
    const isDeclined = interest.status === 'declined';

    return (
      <PlatformCard style={styles.interestCard}>
        <TouchableOpacity
          onPress={() => handleViewProfile(profile.id)}
          style={styles.profileSection}
          activeOpacity={0.7}
        >
          <Avatar
            uri={primaryImage}
            name={profile.fullName}
            size="lg"
          />
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {formatName(profile.fullName)}
            </Text>
            
            <View style={styles.profileDetails}>
              <Ionicons name="location-outline" size={14} color={Colors.neutral[500]} />
              <Text style={styles.profileLocation}>{profile.ukCity}</Text>
            </View>
            
            {profile.occupation && (
              <View style={styles.profileDetails}>
                <Ionicons name="briefcase-outline" size={14} color={Colors.neutral[500]} />
                <Text style={styles.profileOccupation}>{profile.occupation}</Text>
              </View>
            )}
            
            <Text style={styles.interestTime}>
              Sent {formatTimeAgo(interest.createdAt)}
            </Text>
          </View>

          {/* Status indicator */}
          <View style={styles.statusSection}>
            {isMatched && (
              <View style={styles.matchedBadge}>
                <Ionicons name="heart" size={16} color={Colors.background.primary} />
                <Text style={styles.matchedText}>Matched</Text>
              </View>
            )}
            {isDeclined && (
              <View style={styles.declinedBadge}>
                <Ionicons name="close" size={16} color={Colors.background.primary} />
                <Text style={styles.declinedText}>Declined</Text>
              </View>
            )}
            {isPending && (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={16} color={Colors.warning[600]} />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actionSection}>
          {isMatched && (
            <Button
              title="Start Chatting 💬"
              variant="primary"
              size="sm"
              onPress={() => handleStartChat(interest)}
              style={styles.chatButton}
              icon={<Ionicons name="chatbubble" size={16} color={Colors.background.primary} />}
            />
          )}
          
          {isPending && (
            <Button
              title="Remove Interest"
              variant="outline"
              size="sm"
              onPress={() => handleRemoveInterest(interest)}
              loading={removing === interest.id}
              style={styles.removeButton}
              icon={<Ionicons name="trash-outline" size={16} color={Colors.error[500]} />}
            />
          )}

          {(isDeclined || isMatched) && (
            <Button
              title="View Profile"
              variant="ghost"
              size="sm"
              onPress={() => handleViewProfile(profile.id)}
              style={styles.viewButton}
              icon={<Ionicons name="person-outline" size={16} color={Colors.primary[500]} />}
            />
          )}
        </View>
      </PlatformCard>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="paper-plane-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No interests sent</Text>
      <Text style={styles.emptySubtitle}>
        Start discovering profiles and send interests to connect with people you like!
      </Text>
      <Button
        title="Start Discovering"
        onPress={() => router.push("/(tabs)/search")}
        variant="outline"
        style={styles.discoverButton}
      />
    </View>
  );

  const renderStats = () => {
    const totalSent = interests.length;
    const matched = interests.filter(i => i.status === 'matched').length;
    const pending = interests.filter(i => i.status === 'sent').length;
    const declined = interests.filter(i => i.status === 'declined').length;

    if (totalSent === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalSent}</Text>
          <Text style={styles.statLabel}>Total Sent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success[500] }]}>{matched}</Text>
          <Text style={styles.statLabel}>Matched</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.warning[500] }]}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.error[500] }]}>{declined}</Text>
          <Text style={styles.statLabel}>Declined</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="paper-plane" size={48} color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading sent interests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {interests.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {renderStats()}
          <FlatList
            data={interests}
            renderItem={renderInterest}
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  statsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background.primary,
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  statLabel: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },

  listContainer: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },

  interestCard: {
    padding: Layout.spacing.lg,
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Layout.spacing.md,
  },

  profileInfo: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },

  profileName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  profileDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },

  profileLocation: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  profileOccupation: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  interestTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Layout.spacing.xs,
  },

  statusSection: {
    alignItems: "flex-end",
  },

  matchedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success[500],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },

  matchedText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  declinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error[500],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },

  declinedText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warning[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },

  pendingText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.warning[600],
    fontWeight: Layout.typography.fontWeight.medium,
  },

  actionSection: {
    flexDirection: "row",
    gap: Layout.spacing.md,
  },

  chatButton: {
    flex: 1,
  },

  removeButton: {
    flex: 1,
  },

  viewButton: {
    flex: 1,
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
    paddingHorizontal: Layout.spacing.xl,
  },
});