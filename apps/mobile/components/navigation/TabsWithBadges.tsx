import React from "react";
import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet } from "react-native";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../../constants";
import { useMatchesList } from "../../hooks/useMessaging";

interface TabIconWithBadgeProps {
  icon: string;
  color: string;
  size: number;
  badgeCount?: number;
}

function TabIconWithBadge({ icon, color, size, badgeCount }: TabIconWithBadgeProps) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={icon as any} size={size} color={color} />
      {badgeCount && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsWithBadges() {
  const { getTotalUnreadCount } = useMatchesList();
  const unreadCount = getTotalUnreadCount();

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
            <TabIconWithBadge icon="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge 
              icon="heart" 
              color={color} 
              size={size} 
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge icon="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: "Premium",
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge icon="diamond" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.background.primary,
    fontSize: 11,
    fontWeight: Layout.typography.fontWeight.bold,
    textAlign: 'center',
  },
});