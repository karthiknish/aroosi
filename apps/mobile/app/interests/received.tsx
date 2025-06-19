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

export default function ReceivedInterests() {
  const { user } = useUser();
  const apiClient = useApiClient();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    loadReceivedInterests();
  }, []);

  const loadReceivedInterests = async () => {
    if (!user) return;

    try {
      const response = await apiClient.getReceivedInterests(user.id);
      if (response.success && response.data) {
        setInterests(response.data.interests || response.data);
      }
    } catch (error) {
      console.error("Error loading received interests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReceivedInterests();
    setRefreshing(false);
  };

  const handleRespondToInterest = async (interest: Interest, response: 'accept' | 'reject') => {
    if (responding) return;

    try {
      setResponding(interest.id);
      await PlatformHaptics.medium();

      const result = await apiClient.respondToInterest(interest.id, response);

      if (result.success) {
        await PlatformHaptics.success();
        
        // Update local state
        setInterests(prev => 
          prev.map(item => 
            item.id === interest.id 
              ? { ...item, status: response === 'accept' ? 'matched' : 'declined' }
              : item
          )
        );

        if (response === 'accept') {
          Alert.alert(
            "It's a Match! 💕",
            `You and ${formatName(interest.fromProfile.fullName)} are now matched! Start chatting to get to know each other.`,
            [
              { text: "Maybe Later", style: "cancel" },
              { 
                text: "Start Chatting", 
                onPress: () => {
                  // Navigate to matches tab or directly to chat
                  router.push("/(tabs)/matches");
                }
              },
            ]
          );
        } else {
          Alert.alert("Interest Declined", "The interest has been declined.");
        }
      } else {
        await PlatformHaptics.error();
        Alert.alert("Error", result.error || "Failed to respond to interest");
      }
    } catch (error) {
      console.error("Error responding to interest:", error);
      await PlatformHaptics.error();
      Alert.alert("Error", "Failed to respond to interest. Please try again.");
    } finally {
      setResponding(null);
    }
  };

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };

  const renderInterest = ({ item: interest }: { item: Interest }) => {
    const profile = interest.fromProfile;
    const primaryImage = profile.profileImageIds?.[0];
    const isPending = interest.status === 'sent' || interest.status === 'received';
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
              {formatTimeAgo(interest.createdAt)}
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

        {/* Action buttons for pending interests */}
        {isPending && (
          <View style={styles.actionSection}>
            <Button
              title="Decline"
              variant="outline"
              size="sm"
              onPress={() => handleRespondToInterest(interest, 'reject')}
              loading={responding === interest.id}
              style={styles.declineButton}
              icon={<Ionicons name="close" size={16} color={Colors.error[500]} />}
            />
            <Button
              title="Accept 💕"
              variant="primary"
              size="sm"
              onPress={() => handleRespondToInterest(interest, 'accept')}
              loading={responding === interest.id}
              style={styles.acceptButton}
            />
          </View>
        )}
      </PlatformCard>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No interests yet</Text>
      <Text style={styles.emptySubtitle}>
        When someone shows interest in your profile, you'll see them here!
      </Text>
      <Button
        title="Discover People"
        onPress={() => router.push("/(tabs)/search")}
        variant="outline"
        style={styles.discoverButton}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="heart" size={48} color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading interests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {interests.length === 0 ? (
        renderEmptyState()
      ) : (
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

  declineButton: {
    flex: 1,
  },

  acceptButton: {
    flex: 2,
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