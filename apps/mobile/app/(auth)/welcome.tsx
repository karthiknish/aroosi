import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Button } from "../../components/ui";
import { Colors, Layout } from "../../constants";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logotype.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Hero Section */}
          <View style={styles.heroContainer}>
            <Text style={styles.title}>Find Your Perfect Match</Text>
            <Text style={styles.subtitle}>
              Connect with genuine people looking for meaningful relationships
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="💕"
              title="Genuine Connections"
              description="Meet real people looking for serious relationships"
            />
            <FeatureItem
              icon="🔒"
              title="Safe & Secure"
              description="Your privacy and safety are our top priorities"
            />
            <FeatureItem
              icon="✨"
              title="Smart Matching"
              description="Advanced algorithms to find your perfect match"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Link href="/(auth)/sign-up" asChild>
            <Button title="Get Started" variant="primary" fullWidth />
          </Link>
          
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <Button title="Sign In" variant="ghost" />
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  
  logoContainer: {
    alignItems: "center",
    marginTop: Layout.spacing.xxl,
    marginBottom: Layout.spacing.xl,
  },
  
  logo: {
    width: 120,
    height: 60,
  },
  
  heroContainer: {
    alignItems: "center",
    marginBottom: Layout.spacing.xxl,
  },
  
  title: {
    fontSize: Layout.typography.fontSize["3xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.md,
  },
  
  subtitle: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.lg,
  },
  
  featuresContainer: {
    gap: Layout.spacing.lg,
  },
  
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  
  featureIcon: {
    fontSize: 32,
    width: 48,
    textAlign: "center",
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  
  featureDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
  },
  
  actionContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.xs,
  },
  
  signInText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
});