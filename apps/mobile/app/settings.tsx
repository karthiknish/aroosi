import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error clerk expo types
import { useAuth } from "@clerk/clerk-expo";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/ui";
import { Colors, Layout } from "../constants";
import { userPreferences, UserPreferences, onboarding } from "../utils/storage";
import { useMatrimonyAppRating } from "../hooks/useAppRating";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const rating = useMatrimonyAppRating();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      let prefs = await userPreferences.load();
      if (!prefs) {
        prefs = await userPreferences.getDefault();
        await userPreferences.save(prefs);
      }
      setPreferences(prefs);
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      await userPreferences.save(newPreferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert("Coming Soon", "Account deletion will be available soon.");
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    try {
      await onboarding.reset();
      Alert.alert("Reset Complete", "Onboarding has been reset.");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  const handleRateApp = async () => {
    try {
      const result = await rating.showRatingPrompt();
      if (result.action === 'rate') {
        Alert.alert("Thank You!", "Thank you for rating Aroosi!");
      }
    } catch (error) {
      console.error("Error showing rating prompt:", error);
    }
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notifications */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingRow
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Manage notification settings and permissions"
            onPress={() => router.push("/notification-settings")}
            showChevron
          />
          
          <SettingRow
            icon="heart-outline"
            title="New Matches"
            subtitle="Get notified when you have a new match"
            rightComponent={
              <Switch
                value={preferences.notifications.matches}
                onValueChange={(value) =>
                  updatePreferences({
                    notifications: { ...preferences.notifications, matches: value },
                  })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
                thumbColor={preferences.notifications.matches ? Colors.primary[500] : Colors.neutral[100]}
              />
            }
          />
          
          <SettingRow
            icon="chatbubble-outline"
            title="Messages"
            subtitle="Get notified when you receive new messages"
            rightComponent={
              <Switch
                value={preferences.notifications.messages}
                onValueChange={(value) =>
                  updatePreferences({
                    notifications: { ...preferences.notifications, messages: value },
                  })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
                thumbColor={preferences.notifications.messages ? Colors.primary[500] : Colors.neutral[100]}
              />
            }
          />
          
          <SettingRow
            icon="star-outline"
            title="Interests"
            subtitle="Get notified when someone likes your profile"
            rightComponent={
              <Switch
                value={preferences.notifications.interests}
                onValueChange={(value) =>
                  updatePreferences({
                    notifications: { ...preferences.notifications, interests: value },
                  })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
                thumbColor={preferences.notifications.interests ? Colors.primary[500] : Colors.neutral[100]}
              />
            }
            showBorder={false}
          />
        </Card>

        {/* Privacy */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <SettingRow
            icon="eye-outline"
            title="Show Online Status"
            subtitle="Let others see when you're online"
            rightComponent={
              <Switch
                value={preferences.privacy.showOnlineStatus}
                onValueChange={(value) =>
                  updatePreferences({
                    privacy: { ...preferences.privacy, showOnlineStatus: value },
                  })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
                thumbColor={preferences.privacy.showOnlineStatus ? Colors.primary[500] : Colors.neutral[100]}
              />
            }
          />
          
          <SettingRow
            icon="location-outline"
            title="Show Distance"
            subtitle="Show your distance to other users"
            rightComponent={
              <Switch
                value={preferences.privacy.showDistance}
                onValueChange={(value) =>
                  updatePreferences({
                    privacy: { ...preferences.privacy, showDistance: value },
                  })
                }
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
                thumbColor={preferences.privacy.showDistance ? Colors.primary[500] : Colors.neutral[100]}
              />
            }
            showBorder={false}
          />
        </Card>

        {/* Account */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SettingRow
            icon="diamond-outline"
            title="Premium Subscription"
            subtitle="Manage your subscription"
            onPress={() => router.push("/subscription")}
            showChevron
          />
          
          <SettingRow
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your profile information"
            onPress={() => router.push("/profile-setup")}
            showChevron
          />
          
          <SettingRow
            icon="shield-outline"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => {
              // TODO: Open privacy policy
              Alert.alert("Coming Soon", "Privacy policy will be available soon.");
            }}
            showChevron
          />
          
          <SettingRow
            icon="document-outline"
            title="Terms of Service"
            subtitle="Read our terms of service"
            onPress={() => {
              // TODO: Open terms of service
              Alert.alert("Coming Soon", "Terms of service will be available soon.");
            }}
            showChevron
            showBorder={false}
          />
        </Card>

        {/* Support */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingRow
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => {
              // TODO: Open help center
              Alert.alert("Coming Soon", "Help center will be available soon.");
            }}
            showChevron
          />
          
          <SettingRow
            icon="mail-outline"
            title="Contact Us"
            subtitle="Send us your feedback"
            onPress={() => router.push("/contact")}
            showChevron
          />
          
          <SettingRow
            icon="star-outline"
            title="Rate Aroosi"
            subtitle="Rate us in the app store"
            onPress={handleRateApp}
            showChevron
          />
          
          <SettingRow
            icon="refresh-outline"
            title="Reset Onboarding"
            subtitle="Reset the app tutorial"
            onPress={handleResetOnboarding}
            showBorder={false}
          />
        </Card>

        {/* Danger Zone */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <SettingRow
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            textColor={Colors.warning[600]}
          />
          
          <SettingRow
            icon="trash-outline"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
            textColor={Colors.error[500]}
            showBorder={false}
          />
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Aroosi Mobile</Text>
          <Text style={styles.appInfoText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  showBorder?: boolean;
  textColor?: string;
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  showChevron = false,
  showBorder = true,
  textColor = Colors.text.primary,
}: SettingRowProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.settingRow, !showBorder && styles.settingRowNoBorder]}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon as any} size={24} color={textColor} />
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: textColor }]}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightComponent}
      {showChevron && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.neutral[400]}
        />
      )}
    </Component>
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
  
  scrollContent: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },
  
  sectionCard: {
    padding: Layout.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },
  
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  
  settingRowNoBorder: {
    borderBottomWidth: 0,
  },
  
  settingContent: {
    flex: 1,
    marginLeft: Layout.spacing.md,
    marginRight: Layout.spacing.sm,
  },
  
  settingTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  settingSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  appInfo: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl,
  },
  
  appInfoText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
    textAlign: "center",
  },
});