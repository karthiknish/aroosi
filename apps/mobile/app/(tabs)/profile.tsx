import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error clerk expo types
import { useAuth, useUser } from "@clerk/clerk-expo";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Avatar } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";
import { Profile as ProfileType } from "../../types";
import { formatAge, formatCity, formatEducation, formatMaritalStatus } from "../../utils/formatting";
import { useInterests } from "../../hooks/useInterests";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const apiClient = useApiClient();
  const { pendingReceivedCount } = useInterests();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data?.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push("/profile-edit");
  };

  const handleBoostProfile = async () => {
    try {
      const response = await apiClient.boostProfile();
      if (response.success) {
        Alert.alert("Profile Boosted!", "Your profile will be shown to more people for the next 30 minutes.");
      }
    } catch (error) {
      console.error("Error boosting profile:", error);
      Alert.alert("Error", "Failed to boost profile. Please try again.");
    }
  };

  const profileImage = profile?.profileImageIds?.[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Complete Your Profile</Text>
          <Text style={styles.emptySubtitle}>
            Create your profile to start meeting amazing people
          </Text>
          <Button
            title="Create Profile"
            onPress={() => router.push("/profile-setup")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              uri={profileImage}
              name={profile.fullName}
              size="xl"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.fullName}</Text>
              <Text style={styles.profileAge}>
                {formatAge(profile.dateOfBirth)}
              </Text>
              <Text style={styles.profileLocation}>
                {formatCity(profile.ukCity)}
              </Text>
            </View>
          </View>

          <Text style={styles.profileBio}>{profile.aboutMe}</Text>

          <View style={styles.actionButtons}>
            <Button
              title="Edit Profile"
              variant="primary"
              onPress={handleEditProfile}
              style={styles.editButton}
            />
            <Button
              title="Boost"
              variant="outline"
              icon={<Ionicons name="flash" size={20} color={Colors.primary[500]} />}
              onPress={handleBoostProfile}
              style={styles.boostButton}
            />
          </View>
        </Card>

        {/* Profile Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>About Me</Text>
          
          <ProfileDetail
            icon="briefcase-outline"
            label="Occupation"
            value={profile.occupation}
          />
          <ProfileDetail
            icon="school-outline"
            label="Education"
            value={formatEducation(profile.education)}
          />
          <ProfileDetail
            icon="heart-outline"
            label="Marital Status"
            value={formatMaritalStatus(profile.maritalStatus)}
          />
          <ProfileDetail
            icon="resize-outline"
            label="Height"
            value={profile.height}
          />
          {profile.religion && (
            <ProfileDetail
              icon="leaf-outline"
              label="Religion"
              value={profile.religion}
            />
          )}
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <ActionItem
            icon="heart-outline"
            title="Interests"
            subtitle="Manage sent and received interests"
            onPress={() => router.push("/interests")}
            showChevron
            badgeCount={pendingReceivedCount}
          />

          <ActionItem
            icon="diamond-outline"
            title="Upgrade to Premium"
            subtitle="Get unlimited likes and more features"
            onPress={() => router.push("/subscription")}
            showChevron
          />
          
          <ActionItem
            icon="eye-outline"
            title="Profile Viewers"
            subtitle="See who viewed your profile"
            onPress={() => router.push("/profile-viewers")}
            showChevron
          />
          
          <ActionItem
            icon="shield-outline"
            title="Safety & Guidelines"
            subtitle="Stay safe while using Aroosi"
            onPress={() => router.push("/safety-guidelines")}
            showChevron
          />

          <ActionItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with your account"
            onPress={() => router.push("/help")}
            showChevron
          />
          
          <ActionItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            textColor={Colors.error[500]}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ProfileDetailProps {
  icon: string;
  label: string;
  value: string;
}

function ProfileDetail({ icon, label, value }: ProfileDetailProps) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={20} color={Colors.neutral[500]} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

interface ActionItemProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  showChevron?: boolean;
  textColor?: string;
  badgeCount?: number;
}

function ActionItem({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  showChevron = false,
  textColor = Colors.text.primary,
  badgeCount
}: ActionItemProps) {
  return (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={textColor} />
        {badgeCount && badgeCount > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>
              {badgeCount > 99 ? '99+' : badgeCount.toString()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, { color: textColor }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.neutral[400]}
        />
      )}
    </TouchableOpacity>
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
  
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.xl,
    gap: Layout.spacing.lg,
  },
  
  emptyTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    textAlign: "center",
  },
  
  emptySubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  
  settingsButton: {
    padding: Layout.spacing.xs,
  },
  
  profileCard: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  
  profileInfo: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  profileName: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  
  profileAge: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  profileLocation: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  profileBio: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.base,
    marginBottom: Layout.spacing.lg,
  },
  
  actionButtons: {
    flexDirection: "row",
    gap: Layout.spacing.md,
  },
  
  editButton: {
    flex: 1,
  },
  
  boostButton: {
    paddingHorizontal: Layout.spacing.lg,
  },
  
  detailsCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  actionsCard: {
    marginHorizontal: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  detailContent: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  detailLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  detailValue: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginTop: Layout.spacing.xs,
  },
  
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  actionContent: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  actionTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  actionSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },

  iconContainer: {
    position: 'relative',
  },

  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  actionBadgeText: {
    color: Colors.background.primary,
    fontSize: 11,
    fontWeight: Layout.typography.fontWeight.bold,
    textAlign: 'center',
  },
});