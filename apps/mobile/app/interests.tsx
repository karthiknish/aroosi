import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../constants";
import SentInterests from "./interests/sent";
import ReceivedInterests from "./interests/received";

type TabType = 'received' | 'sent';

export default function InterestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('received');

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Interests</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'received' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('received')}
      >
        <Ionicons 
          name="heart" 
          size={20} 
          color={activeTab === 'received' ? Colors.primary[500] : Colors.text.secondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'received' && styles.activeTabText,
        ]}>
          Received
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'sent' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('sent')}
      >
        <Ionicons 
          name="paper-plane" 
          size={20} 
          color={activeTab === 'sent' ? Colors.primary[500] : Colors.text.secondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'sent' && styles.activeTabText,
        ]}>
          Sent
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      
      <View style={styles.content}>
        {activeTab === 'received' ? (
          <ReceivedInterests />
        ) : (
          <SentInterests />
        )}
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  backButton: {
    padding: Layout.spacing.xs,
  },

  headerTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    gap: Layout.spacing.xs,
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary[500],
  },

  tabText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.secondary,
  },

  activeTabText: {
    color: Colors.primary[500],
    fontWeight: Layout.typography.fontWeight.semibold,
  },

  content: {
    flex: 1,
  },
});