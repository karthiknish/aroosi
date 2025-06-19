import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "../components/ui";
import { Colors, Layout } from "../constants";

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
}

interface Statistic {
  icon: string;
  number: string;
  label: string;
}

export default function AboutScreen() {
  const features: FeatureItem[] = [
    {
      icon: "people-outline",
      title: "Cultural Understanding",
      description: "We understand the importance of Afghan culture and traditions in finding the right life partner.",
    },
    {
      icon: "heart-outline",
      title: "Meaningful Connections",
      description: "Focus on building serious relationships with the intent of marriage and family.",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Safe & Secure",
      description: "Advanced privacy controls and verification systems to ensure your safety.",
    },
    {
      icon: "star-outline",
      title: "Quality Matches",
      description: "Carefully curated profiles to help you find compatible partners who share your values.",
    },
  ];

  const statistics: Statistic[] = [
    {
      icon: "people",
      number: "10K+",
      label: "Active Members",
    },
    {
      icon: "heart",
      number: "500+",
      label: "Success Stories",
    },
    {
      icon: "calendar",
      number: "2",
      label: "Years Serving",
    },
    {
      icon: "location",
      number: "UK Wide",
      label: "Coverage",
    },
  ];

  const handleContactPress = () => {
    router.push("/contact");
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:support@aroosi.co.uk");
  };

  const handleGetStarted = () => {
    router.push("/(tabs)/search");
  };

  const renderFeature = (feature: FeatureItem, index: number) => (
    <Card key={index} style={styles.featureCard}>
      <View style={styles.featureContent}>
        <View style={styles.featureIcon}>
          <Ionicons name={feature.icon as any} size={28} color={Colors.primary[500]} />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>
    </Card>
  );

  const renderStatistic = (stat: Statistic, index: number) => (
    <View key={index} style={styles.statItem}>
      <View style={styles.statIcon}>
        <Ionicons name={stat.icon as any} size={24} color={Colors.primary[500]} />
      </View>
      <Text style={styles.statNumber}>{stat.number}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Aroosi</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Connecting Hearts with{"\n"}
              <Text style={styles.heroHighlight}>Purpose</Text> and{" "}
              <Text style={styles.heroHighlight}>Tradition</Text>
            </Text>
            <Text style={styles.heroDescription}>
              Aroosi was founded with a simple mission: to help Afghans in the UK find their perfect life partner while honoring Afghan cultural values and traditions.
            </Text>
          </View>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Card style={styles.missionCard}>
            <Text style={styles.missionText}>
              To provide a safe, respectful, and culturally-aware platform where Afghan singles can find meaningful relationships that lead to marriage, while preserving our rich cultural heritage and Islamic values.
            </Text>
          </Card>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Impact</Text>
          <View style={styles.statsContainer}>
            {statistics.map(renderStatistic)}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Aroosi?</Text>
          <View style={styles.featuresContainer}>
            {features.map(renderFeature)}
          </View>
        </View>

        {/* Our Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Card style={styles.storyCard}>
            <Text style={styles.storyText}>
              Founded in 2022, Aroosi was born from the recognition that Afghan families in the UK needed a dedicated platform to find suitable life partners for their children. Understanding the unique challenges faced by the Afghan diaspora, we created a space that respects traditional values while embracing modern technology.
            </Text>
            <Text style={styles.storyText}>
              Our team, comprised of Afghan professionals and community leaders, works tirelessly to ensure that every match made on our platform is built on mutual respect, shared values, and genuine compatibility.
            </Text>
          </Card>
        </View>

        {/* Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          <View style={styles.valuesContainer}>
            <View style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Ionicons name="heart" size={20} color={Colors.primary[500]} />
              </View>
              <Text style={styles.valueTitle}>Respect</Text>
              <Text style={styles.valueDescription}>Honoring Afghan culture and Islamic principles</Text>
            </View>
            
            <View style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primary[500]} />
              </View>
              <Text style={styles.valueTitle}>Trust</Text>
              <Text style={styles.valueDescription}>Building safe and secure connections</Text>
            </View>
            
            <View style={styles.valueItem}>
              <View style={styles.valueIcon}>
                <Ionicons name="people" size={20} color={Colors.primary[500]} />
              </View>
              <Text style={styles.valueTitle}>Community</Text>
              <Text style={styles.valueDescription}>Strengthening Afghan families worldwide</Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Card style={styles.contactCard}>
            <Text style={styles.contactText}>
              Have questions or need support? We're here to help you on your journey to finding your perfect match.
            </Text>
            <View style={styles.contactButtons}>
              <Button
                title="Contact Us"
                onPress={handleContactPress}
                style={styles.contactButton}
                variant="outline"
              />
              <Button
                title="Email Support"
                onPress={handleEmailPress}
                style={styles.contactButton}
                variant="ghost"
              />
            </View>
          </Card>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Card style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to Start Your Journey?</Text>
            <Text style={styles.ctaDescription}>
              Join thousands of Afghan singles who have found love and companionship through Aroosi.
            </Text>
            <Button
              title="Get Started"
              onPress={handleGetStarted}
              style={styles.ctaButton}
            />
          </Card>
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
  },
  
  heroSection: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.xl * 2,
  },
  
  heroContent: {
    alignItems: "center",
    textAlign: "center",
  },
  
  heroTitle: {
    fontSize: Layout.typography.fontSize["3xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.background.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
    lineHeight: Layout.typography.lineHeight.tight,
  },
  
  heroHighlight: {
    color: Colors.warning[200],
  },
  
  heroDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.relaxed,
    opacity: 0.9,
  },
  
  section: {
    padding: Layout.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
    textAlign: "center",
  },
  
  missionCard: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  
  missionText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.relaxed,
    textAlign: "center",
    fontStyle: "italic",
  },
  
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Layout.spacing.md,
  },
  
  statItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  
  statNumber: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[500],
    marginBottom: Layout.spacing.xs,
  },
  
  statLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  featuresContainer: {
    gap: Layout.spacing.md,
  },
  
  featureCard: {
    padding: Layout.spacing.lg,
  },
  
  featureContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Layout.spacing.md,
  },
  
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  
  featureText: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  
  featureDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
  
  storyCard: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  
  storyText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    lineHeight: Layout.typography.lineHeight.relaxed,
    textAlign: "justify",
  },
  
  valuesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Layout.spacing.md,
  },
  
  valueItem: {
    flex: 1,
    minWidth: "30%",
    alignItems: "center",
    padding: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  
  valueTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  valueDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  
  contactCard: {
    padding: Layout.spacing.lg,
    alignItems: "center",
  },
  
  contactText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
  
  contactButtons: {
    flexDirection: "row",
    gap: Layout.spacing.md,
    width: "100%",
  },
  
  contactButton: {
    flex: 1,
  },
  
  ctaSection: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },
  
  ctaCard: {
    padding: Layout.spacing.xl,
    alignItems: "center",
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[200],
  },
  
  ctaTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.md,
  },
  
  ctaDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Layout.spacing.lg,
    lineHeight: Layout.typography.lineHeight.relaxed,
  },
  
  ctaButton: {
    paddingHorizontal: Layout.spacing.xl,
  },
});