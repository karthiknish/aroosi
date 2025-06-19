import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
// @ts-expect-error clerk expo types
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "../constants";
import { useOnboarding } from "../hooks/useOnboarding";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAuth();
  const { shouldShow: shouldShowOnboarding, isLoading: onboardingLoading } = useOnboarding();

  // Show loading spinner while auth and onboarding are loading
  if (!isLoaded || onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  // Redirect based on authentication status and onboarding state
  if (isSignedIn) {
    // If user needs onboarding, redirect to onboarding
    if (shouldShowOnboarding) {
      return <Redirect href="/onboarding" />;
    }
    // Otherwise, go to main app
    return <Redirect href="/(tabs)/search" />;
  } else {
    return <Redirect href="/(auth)/welcome" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
