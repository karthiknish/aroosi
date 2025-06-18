import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../../constants";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopColor: Colors.border.primary,
          borderTopWidth: 1,
          paddingTop: Platform.OS === "ios" ? Layout.spacing.xs : 0,
          height: Platform.OS === "ios" ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: Layout.typography.fontSize.xs,
          fontWeight: Layout.typography.fontWeight.medium,
          marginBottom: Platform.OS === "ios" ? 0 : Layout.spacing.xs,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
          tabBarBadge: undefined, // Will be set dynamically for unread count
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: "Premium",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="diamond" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}