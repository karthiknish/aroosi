import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
// @ts-expect-error types from @clerk/clerk-expo not in repo
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
// @ts-expect-error expo-secure-store types provided at runtime
import * as SecureStore from "expo-secure-store";
import { StyleSheet } from "react-native";
import { Colors } from "../constants";
import usePushNotifications from "../hooks/usePushNotifications";
import { useMatrimonyAppRating } from "../hooks/useAppRating";
import { 
  ErrorBoundary, 
  OfflineBanner, 
  errorReporter 
} from "../components/error";

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

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize: initializePushNotifications } = usePushNotifications();
  const { userId } = useAuth();
  const rating = useMatrimonyAppRating({
    minimumUsageDays: 3,
    minimumLaunches: 5,
    minimumSignificantEvents: 3,
  });

  useEffect(() => {
    // Initialize push notifications
    initializePushNotifications();
    
    // Configure error reporting
    errorReporter.configure({
      enabled: !__DEV__,
      endpoint: process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT,
    });
    
    // Check if we should show rating prompt after a delay
    const checkRatingPrompt = async () => {
      setTimeout(async () => {
        await rating.checkAndShowRatingPrompt();
      }, 2000); // Wait 2 seconds after app load
    };
    
    checkRatingPrompt();
  }, []);

  useEffect(() => {
    // Add user context to error reports when user logs in
    if (userId) {
      errorReporter.addBreadcrumb(`User logged in: ${userId}`, 'auth');
    }
  }, [userId]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Report critical app-level errors
        errorReporter.reportError(error, {
          component: 'RootLayout',
          level: 'critical',
          errorInfo,
        });
      }}
    >
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ClerkProvider
            publishableKey={
              process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string
            }
            tokenCache={tokenCache}
          >
            <AppInitializer>
              <StatusBar style="auto" />
              
              {/* Global Offline Banner */}
              <OfflineBanner position="top" />
              
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
            <Stack.Screen
              name="search-filters"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="premium-settings"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="about"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="contact"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="faq"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="how-it-works"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="privacy"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="terms"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="help"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="profile-viewers"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="profile-edit"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notification-settings"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="interests"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="safety-guidelines"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="report-user"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="blocked-users"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </Stack>
            </AppInitializer>
          </ClerkProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
});
