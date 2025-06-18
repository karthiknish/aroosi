import React, { useState } from "react";
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
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "../../components/ui";
import { Colors, Layout } from "../../constants";
import { useApiClient } from "../../utils/api";

export default function PremiumScreen() {
  const apiClient = useApiClient();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: 'premium' | 'premiumPlus') => {
    try {
      setLoading(planId);
      const response = await apiClient.createCheckoutSession(planId);
      
      if (response.success && response.data?.url) {
        // TODO: Open the checkout URL in a web browser
        console.log("Checkout URL:", response.data.url);
        Alert.alert("Redirecting", "Opening payment page...");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      Alert.alert("Error", "Failed to start subscription. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const premiumFeatures = [
    {
      icon: "heart",
      title: "Unlimited Likes",
      description: "Like as many profiles as you want",
    },
    {
      icon: "eye",
      title: "See Who Likes You",
      description: "View everyone who liked your profile",
    },
    {
      icon: "flash",
      title: "Profile Boost",
      description: "Get 5x more profile views",
    },
    {
      icon: "chatbubbles",
      title: "Priority Messages",
      description: "Your messages appear first",
    },
  ];

  const premiumPlusFeatures = [
    ...premiumFeatures,
    {
      icon: "options",
      title: "Advanced Filters",
      description: "Filter by education, lifestyle & more",
    },
    {
      icon: "shield-checkmark",
      title: "Read Receipts",
      description: "See when your messages are read",
    },
    {
      icon: "star",
      title: "Priority Support",
      description: "Get help faster with premium support",
    },
    {
      icon: "location",
      title: "Passport",
      description: "Match with people anywhere in the world",
    },
  ];

  const FeatureItem = ({ icon, title, description }: {
    icon: string;
    title: string;
    description: string;
  }) => (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={20} color={Colors.primary[500]} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Premium Plans</Text>
          <Text style={styles.headerSubtitle}>
            Unlock premium features to find your perfect match faster
          </Text>
        </View>

        {/* Premium Plan */}
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planTitleContainer}>
              <Text style={styles.planTitle}>Premium</Text>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>POPULAR</Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>£19.99</Text>
              <Text style={styles.period}>/month</Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            {premiumFeatures.map((feature, index) => (
              <FeatureItem key={index} {...feature} />
            ))}
          </View>

          <Button
            title="Get Premium"
            onPress={() => handleSubscribe('premium')}
            loading={loading === 'premium'}
            disabled={loading !== null}
            fullWidth
          />
        </Card>

        {/* Premium Plus Plan */}
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planTitleContainer}>
              <Text style={styles.planTitle}>Premium Plus</Text>
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>£29.99</Text>
              <Text style={styles.period}>/month</Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            {premiumPlusFeatures.map((feature, index) => (
              <FeatureItem key={index} {...feature} />
            ))}
          </View>

          <Button
            title="Get Premium Plus"
            onPress={() => handleSubscribe('premiumPlus')}
            loading={loading === 'premiumPlus'}
            disabled={loading !== null}
            fullWidth
          />
        </Card>

        {/* Benefits Section */}
        <Card style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why Choose Premium?</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={24} color={Colors.success[500]} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>5x More Matches</Text>
              <Text style={styles.benefitDescription}>
                Premium users get significantly more matches and conversations
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="time" size={24} color={Colors.primary[500]} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Save Time</Text>
              <Text style={styles.benefitDescription}>
                See who likes you first and focus on mutual interests
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.warning[500]} />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Better Experience</Text>
              <Text style={styles.benefitDescription}>
                Enjoy an ad-free experience with priority customer support
              </Text>
            </View>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/search")}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>Continue with Free</Text>
          </TouchableOpacity>
          
          <Text style={styles.footerNote}>
            All subscriptions auto-renew. Cancel anytime in your account settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },
  
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl,
    backgroundColor: Colors.background.primary,
    alignItems: "center",
  },
  
  headerTitle: {
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  headerSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  planCard: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  planHeader: {
    marginBottom: Layout.spacing.lg,
  },
  
  planTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Layout.spacing.sm,
  },
  
  planTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  
  popularBadge: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
  },
  
  popularText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  
  bestValueBadge: {
    backgroundColor: Colors.success[500],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
  },
  
  bestValueText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  
  price: {
    fontSize: Layout.typography.fontSize["3xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[500],
  },
  
  period: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    marginLeft: Layout.spacing.xs,
  },
  
  featuresContainer: {
    marginBottom: Layout.spacing.xl,
    gap: Layout.spacing.md,
  },
  
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.md,
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  featureDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  benefitsCard: {
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
  },
  
  benefitsTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
    textAlign: "center",
  },
  
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.lg,
  },
  
  benefitContent: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  
  benefitTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  
  benefitDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  
  footer: {
    paddingHorizontal: Layout.spacing.lg,
    alignItems: "center",
  },
  
  continueButton: {
    paddingVertical: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  
  continueText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.medium,
  },
  
  footerNote: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: "center",
    paddingHorizontal: Layout.spacing.lg,
  },
});