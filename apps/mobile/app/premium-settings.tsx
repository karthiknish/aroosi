import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "../components/ui";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";

interface UserProfile {
  subscriptionPlan: "free" | "premium" | "premiumPlus";
  hideFromFreeUsers?: boolean;
  boostedUntil?: number;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
  isProfileComplete?: boolean;
}

interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
  available: boolean;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  action?: () => void;
}

export default function PremiumSettingsScreen() {
  const apiClient = useApiClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hideFromFreeUsers, setHideFromFreeUsers] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setProfile(response.data);
        setHideFromFreeUsers(response.data.hideFromFreeUsers || false);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile information");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.updateProfile({
        hideFromFreeUsers,
      });
      
      if (response.success) {
        Alert.alert("Success", "Settings saved successfully");
        await loadProfile(); // Refresh profile data
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBoostProfile = async () => {
    Alert.alert(
      "Profile Boost",
      "Boost your profile to get more visibility for the next 24 hours?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Boost Profile",
          onPress: async () => {
            try {
              const response = await apiClient.boostProfile();
              if (response.success) {
                Alert.alert("Success!", "Your profile has been boosted for 24 hours!");
                await loadProfile();
              } else {
                throw new Error("Failed to boost profile");
              }
            } catch (error) {
              console.error("Error boosting profile:", error);
              Alert.alert("Error", "Failed to boost profile. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    Alert.alert(
      "Manage Subscription",
      "To manage your subscription, please visit your account settings in the App Store or Google Play Store.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            // This would open the respective app store settings
            // For iOS: App Store > Account > Subscriptions
            // For Android: Google Play Store > Account > Payments & subscriptions
            Alert.alert("Instructions", "Please go to your device's app store settings to manage your subscription.");
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    router.push("/(tabs)/premium");
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Settings</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load profile</Text>
            <Button title="Retry" onPress={loadProfile} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const isPremium = profile.subscriptionPlan === "premium" || profile.subscriptionPlan === "premiumPlus";
  const isPremiumPlus = profile.subscriptionPlan === "premiumPlus";
  const isBoosted = profile.boostedUntil && profile.boostedUntil > Date.now();

  const getSubscriptionBadge = () => {
    switch (profile.subscriptionPlan) {
      case "premium":
        return { text: "Premium", color: Colors.primary[500], icon: "diamond-outline" };
      case "premiumPlus":
        return { text: "Premium Plus", color: Colors.warning[500], icon: "flash-outline" };
      default:
        return { text: "Free", color: Colors.neutral[500], icon: "person-outline" };
    }
  };

  const premiumFeatures: PremiumFeature[] = [
    {
      icon: "heart-outline",
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
      available: isPremium,
      action: () => router.push("/(tabs)/search"),
    },
    {
      icon: "chatbubble-outline",
      title: "Chat with Matches",
      description: "Start conversations with your matches",
      available: isPremium,
      action: () => router.push("/(tabs)/matches"),
    },
    {
      icon: "eye-off-outline",
      title: "Privacy Controls",
      description: "Hide your profile from free users",
      available: isPremium,
      isToggle: true,
      toggleValue: hideFromFreeUsers,
      onToggle: setHideFromFreeUsers,
    },
    {
      icon: "people-outline",
      title: "Daily Match Suggestions",
      description: "Get personalized matches every day",
      available: isPremium,
      action: () => router.push("/(tabs)/search"),
    },
  ];

  const premiumPlusFeatures: PremiumFeature[] = [
    {
      icon: "flash-outline",
      title: "Profile Boost",
      description: isBoosted ? "Profile is currently boosted" : "Boost your profile for 24 hours",
      available: isPremiumPlus,
      action: handleBoostProfile,
    },
    {
      icon: "filter-outline",
      title: "Advanced Filters",
      description: "Filter by education, lifestyle, and more",
      available: isPremiumPlus,
      action: () => router.push("/search-filters"),
    },
    {
      icon: "star-outline",
      title: "Priority Support",
      description: "Get priority customer support",
      available: isPremiumPlus,
    },
  ];

  const renderFeature = (feature: PremiumFeature, index: number) => (
    <Card key={index} style={styles.featureCard}>
      <View style={styles.featureContent}>
        <View style={styles.featureLeft}>
          <View style={[styles.featureIcon, !feature.available && styles.disabledFeatureIcon]}>
            <Ionicons 
              name={feature.icon as any} 
              size={24} 
              color={feature.available ? Colors.primary[500] : Colors.neutral[400]} 
            />
          </View>
          <View style={styles.featureText}>
            <Text style={[styles.featureTitle, !feature.available && styles.disabledText]}>
              {feature.title}
            </Text>
            <Text style={[styles.featureDescription, !feature.available && styles.disabledText]}>
              {feature.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.featureRight}>
          {feature.isToggle && feature.available ? (
            <Switch
              value={feature.toggleValue}
              onValueChange={feature.onToggle}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={feature.toggleValue ? Colors.primary[500] : Colors.neutral[400]}
            />
          ) : feature.available && feature.action ? (
            <TouchableOpacity onPress={feature.action} style={styles.featureButton}>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
          ) : !feature.available ? (
            <Ionicons name="lock-closed" size={20} color={Colors.neutral[400]} />
          ) : null}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Subscription Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <View style={styles.statusIcon}>
                <Ionicons 
                  name={getSubscriptionBadge().icon as any} 
                  size={24} 
                  color={getSubscriptionBadge().color} 
                />
              </View>
              <View>
                <Text style={styles.statusTitle}>Current Plan</Text>
                <Text style={[styles.statusPlan, { color: getSubscriptionBadge().color }]}>
                  {getSubscriptionBadge().text}
                </Text>
              </View>
            </View>
            
            {!isPremium && (
              <Button
                title="Upgrade"
                size="sm"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
              />
            )}
          </View>
          
          {profile.subscriptionEndDate && (
            <Text style={styles.subscriptionEndDate}>
              {isPremium ? "Renews" : "Ends"} on {new Date(profile.subscriptionEndDate).toLocaleDateString()}
            </Text>
          )}
          
          {isBoosted && (
            <View style={styles.boostIndicator}>
              <Ionicons name="flash" size={16} color={Colors.warning[500]} />
              <Text style={styles.boostText}>
                Profile boosted until {new Date(profile.boostedUntil!).toLocaleString()}
              </Text>
            </View>
          )}
        </Card>

        {/* Premium Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {premiumFeatures.map(renderFeature)}
        </View>

        {/* Premium Plus Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Plus Features</Text>
          {premiumPlusFeatures.map(renderFeature)}
        </View>

        {/* Subscription Management */}
        {isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Management</Text>
            <Card style={styles.managementCard}>
              <TouchableOpacity onPress={handleManageSubscription} style={styles.managementButton}>
                <View style={styles.managementLeft}>
                  <Ionicons name="settings-outline" size={24} color={Colors.primary[500]} />
                  <View style={styles.managementText}>
                    <Text style={styles.managementTitle}>Manage Subscription</Text>
                    <Text style={styles.managementDescription}>Cancel, change plan, or update payment</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
              </TouchableOpacity>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      {isPremium && (
        <View style={styles.bottomContainer}>
          <Button
            title="Save Settings"
            onPress={handleSaveSettings}
            loading={saving}
            style={styles.saveButton}
          />
        </View>
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
  },
  
  loadingText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Layout.spacing.lg,
  },
  
  errorText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.error[500],
  },
  
  statusCard: {
    marginBottom: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Layout.spacing.sm,
  },
  
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  
  statusTitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  
  statusPlan: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  
  upgradeButton: {
    paddingHorizontal: Layout.spacing.lg,
  },
  
  subscriptionEndDate: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  boostIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    marginTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: Colors.warning[100],
    borderRadius: Layout.radius.md,
    alignSelf: "flex-start",
  },
  
  boostText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.warning[700],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  section: {
    marginBottom: Layout.spacing.xl,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  
  featureCard: {
    marginBottom: Layout.spacing.sm,
    padding: Layout.spacing.md,
  },
  
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  
  featureLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Layout.spacing.md,
  },
  
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  
  disabledFeatureIcon: {
    backgroundColor: Colors.neutral[100],
  },
  
  featureText: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  featureDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  disabledText: {
    color: Colors.neutral[400],
  },
  
  featureRight: {
    marginLeft: Layout.spacing.md,
  },
  
  featureButton: {
    padding: Layout.spacing.xs,
  },
  
  managementCard: {
    padding: 0,
    overflow: "hidden",
  },
  
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Layout.spacing.lg,
  },
  
  managementLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  managementText: {
    flex: 1,
  },
  
  managementTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  managementDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  
  bottomContainer: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  
  saveButton: {
    width: "100%",
  },
});