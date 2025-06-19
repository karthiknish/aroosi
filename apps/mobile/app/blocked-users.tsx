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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { BlockedUser } from "../types";
import { formatTimeAgo, formatName } from "../utils/formatting";
import { Button, Avatar } from "../components/ui";
import PlatformCard from "../components/ui/PlatformCard";
import PlatformHaptics from "../utils/PlatformHaptics";

export default function BlockedUsersScreen() {
  const apiClient = useApiClient();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const response = await apiClient.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data.blockedUsers || response.data);
      }
    } catch (error) {
      console.error("Error loading blocked users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblockUser = async (blockedUser: BlockedUser) => {
    if (unblocking) return;

    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${formatName(blockedUser.blockedProfile.fullName)}? They will be able to see your profile and contact you again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            try {
              setUnblocking(blockedUser.id);
              await PlatformHaptics.medium();

              const response = await apiClient.unblockUser(blockedUser.blockedUserId);

              if (response.success) {
                await PlatformHaptics.success();
                
                // Remove from local state
                setBlockedUsers(prev => 
                  prev.filter(item => item.id !== blockedUser.id)
                );
                
                Alert.alert("User Unblocked", `${formatName(blockedUser.blockedProfile.fullName)} has been unblocked.`);
              } else {
                await PlatformHaptics.error();
                Alert.alert("Error", response.error || "Failed to unblock user");
              }
            } catch (error) {
              console.error("Error unblocking user:", error);
              await PlatformHaptics.error();
              Alert.alert("Error", "Failed to unblock user. Please try again.");
            } finally {
              setUnblocking(null);
            }
          }
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Blocked Users</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderBlockedUser = ({ item: blockedUser }: { item: BlockedUser }) => {
    const profile = blockedUser.blockedProfile;
    const primaryImage = profile.profileImageIds?.[0];

    return (
      <PlatformCard style={styles.blockedUserCard}>
        <View style={styles.userContent}>
          <Avatar
            uri={primaryImage}
            name={profile.fullName}
            size="md"
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {formatName(profile.fullName)}
            </Text>
            
            <View style={styles.userDetails}>
              <Ionicons name="location-outline" size={14} color={Colors.neutral[500]} />
              <Text style={styles.userLocation}>{profile.ukCity}</Text>
            </View>
            
            <Text style={styles.blockedTime}>
              Blocked {formatTimeAgo(blockedUser.createdAt)}
            </Text>
          </View>

          <Button
            title="Unblock"
            variant="outline"
            size="sm"
            onPress={() => handleUnblockUser(blockedUser)}
            loading={unblocking === blockedUser.id}
            style={styles.unblockButton}
            icon={<Ionicons name="person-add-outline" size={16} color={Colors.primary[500]} />}
          />
        </View>
      </PlatformCard>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ban-outline" size={64} color={Colors.neutral[300]} />
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptySubtitle}>
        Users you block will appear here. You can unblock them at any time.
      </Text>
      <Button
        title="Safety Guidelines"
        onPress={() => router.push("/safety-guidelines")}
        variant="outline"
        style={styles.guidelinesButton}
        icon={<Ionicons name="shield-outline" size={20} color={Colors.primary[500]} />}
      />
    </View>
  );

  const renderInfo = () => (
    <PlatformCard style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.info[500]} />
        <Text style={styles.infoTitle}>About Blocking</Text>
      </View>
      <Text style={styles.infoText}>
        When you block someone, they won't be able to see your profile, send you messages, 
        or find you in search results. You can unblock them at any time.
      </Text>
    </PlatformCard>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Ionicons name="ban" size={48} color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading blocked users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {blockedUsers.length === 0 ? (
        <>
          {renderInfo()}
          {renderEmptyState()}
        </>
      ) : (
        <>
          {renderInfo()}
          <FlatList
            data={blockedUsers}
            renderItem={renderBlockedUser}
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
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  backButton: {
    padding: Layout.spacing.xs,
  },

  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  headerSpacer: {
    width: 40,
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

  infoCard: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.info[50],
    borderWidth: 1,
    borderColor: Colors.info[200],
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },

  infoTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.info[500],
    marginLeft: Layout.spacing.sm,
  },

  infoText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.sm,
  },

  listContainer: {
    padding: Layout.spacing.lg,
    paddingTop: 0,
    gap: Layout.spacing.md,
  },

  blockedUserCard: {
    padding: Layout.spacing.lg,
  },

  userContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  userInfo: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },

  userName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  userDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
  },

  userLocation: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  blockedTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },

  unblockButton: {
    paddingHorizontal: Layout.spacing.md,
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

  guidelinesButton: {
    paddingHorizontal: Layout.spacing.xl,
  },
});