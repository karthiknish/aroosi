import React from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
// @ts-expect-error types from @clerk/clerk-expo not in repo
import { ClerkProvider } from "@clerk/clerk-expo";
// @ts-expect-error expo-secure-store types provided at runtime
import * as SecureStore from "expo-secure-store";
import { StyleSheet } from "react-native";
import { Colors } from "../constants";

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={
            process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string
          }
          tokenCache={tokenCache}
        >
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="profile-setup"
              options={{
                presentation: "modal",
                headerShown: true,
                headerTitle: "Complete Your Profile",
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="chat"
              options={{
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="profile-detail"
              options={{
                headerShown: true,
                headerBackTitleVisible: false,
                headerTitle: "",
              }}
            />
            <Stack.Screen
              name="subscription"
              options={{
                presentation: "modal",
                headerShown: true,
                headerTitle: "Premium Plans",
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                headerTitle: "Settings",
                headerBackTitleVisible: false,
              }}
            />
          </Stack>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
});
