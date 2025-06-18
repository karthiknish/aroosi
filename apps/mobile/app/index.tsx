import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
// @ts-expect-error clerk expo types
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "../constants";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  // Redirect based on authentication status
  if (isSignedIn) {
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
