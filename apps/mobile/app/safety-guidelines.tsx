import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../constants";
import { Button } from "../components/ui";
import PlatformCard from "../components/ui/PlatformCard";

interface SafetyTipProps {
  icon: string;
  title: string;
  description: string;
  color?: string;
}

function SafetyTip({ icon, title, description, color = Colors.primary[500] }: SafetyTipProps) {
  return (
    <PlatformCard style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <View style={[styles.tipIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.tipTitle}>{title}</Text>
      </View>
      <Text style={styles.tipDescription}>{description}</Text>
    </PlatformCard>
  );
}

export default function SafetyGuidelinesScreen() {
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Safety Guidelines</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderIntro = () => (
    <PlatformCard style={styles.introCard}>
      <View style={styles.introHeader}>
        <Ionicons name="shield-checkmark" size={32} color={Colors.success[500]} />
        <Text style={styles.introTitle}>Your Safety Matters</Text>
      </View>
      <Text style={styles.introText}>
        At Aroosi, we're committed to creating a safe and respectful environment for everyone. 
        Follow these guidelines to protect yourself and others while using our platform.
      </Text>
    </PlatformCard>
  );

  const renderGeneralTips = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>General Safety Tips</Text>
      
      <SafetyTip
        icon="person-circle-outline"
        title="Verify Profiles"
        description="Look for verified profiles and be cautious of incomplete or suspicious profiles. Trust your instincts if something doesn't feel right."
        color={Colors.primary[500]}
      />
      
      <SafetyTip
        icon="chatbubble-outline"
        title="Keep Conversations on Platform"
        description="Continue conversations within the app until you feel comfortable. Avoid sharing personal contact information too quickly."
        color={Colors.info[500]}
      />
      
      <SafetyTip
        icon="eye-outline"
        title="Protect Personal Information"
        description="Don't share sensitive information like your home address, workplace details, or financial information with strangers."
        color={Colors.warning[500]}
      />
      
      <SafetyTip
        icon="people-outline"
        title="Meet in Public Places"
        description="When ready to meet in person, choose public places and let friends or family know your plans."
        color={Colors.success[500]}
      />
    </View>
  );

  const renderRedFlags = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Warning Signs</Text>
      
      <SafetyTip
        icon="warning-outline"
        title="Requests for Money"
        description="Be extremely cautious of anyone asking for money, gifts, or financial assistance, especially early in conversations."
        color={Colors.error[500]}
      />
      
      <SafetyTip
        icon="image-outline"
        title="Inappropriate Content"
        description="Report users who send inappropriate photos, messages, or requests. You have the right to feel safe and respected."
        color={Colors.error[500]}
      />
      
      <SafetyTip
        icon="flash-outline"
        title="Rushing to Meet"
        description="Be wary of users who pressure you to meet quickly or move the conversation off the platform immediately."
        color={Colors.error[500]}
      />
      
      <SafetyTip
        icon="location-outline"
        title="Personal Details Requests"
        description="Avoid sharing your exact location, home address, or workplace until you've built trust over time."
        color={Colors.error[500]}
      />
    </View>
  );

  const renderReportingTools = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reporting & Blocking</Text>
      
      <PlatformCard style={styles.toolsCard}>
        <View style={styles.toolItem}>
          <Ionicons name="flag-outline" size={20} color={Colors.error[500]} />
          <View style={styles.toolContent}>
            <Text style={styles.toolTitle}>Report Inappropriate Behavior</Text>
            <Text style={styles.toolDescription}>
              Report users who violate our community standards. We review all reports seriously.
            </Text>
          </View>
        </View>
        
        <View style={styles.toolDivider} />
        
        <View style={styles.toolItem}>
          <Ionicons name="ban-outline" size={20} color={Colors.error[500]} />
          <View style={styles.toolContent}>
            <Text style={styles.toolTitle}>Block Unwanted Users</Text>
            <Text style={styles.toolDescription}>
              Block users to prevent them from contacting you or viewing your profile.
            </Text>
          </View>
        </View>
      </PlatformCard>
    </View>
  );

  const renderEmergencyInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Emergency Resources</Text>
      
      <PlatformCard style={[styles.emergencyCard, { backgroundColor: Colors.error[50] }]}>
        <View style={styles.emergencyHeader}>
          <Ionicons name="call-outline" size={24} color={Colors.error[500]} />
          <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
        </View>
        <Text style={styles.emergencyText}>
          If you're in immediate danger, contact emergency services:
        </Text>
        <View style={styles.emergencyNumbers}>
          <Text style={styles.emergencyNumber}>🚨 Emergency: 999</Text>
          <Text style={styles.emergencyNumber}>👮‍♀️ Police: 101</Text>
          <Text style={styles.emergencyNumber}>🆘 Women's Aid: 0808 2000 247</Text>
        </View>
      </PlatformCard>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <Button
        title="View Blocked Users"
        variant="outline"
        onPress={() => router.push("/blocked-users")}
        style={styles.actionButton}
        icon={<Ionicons name="ban-outline" size={20} color={Colors.text.secondary} />}
      />
      
      <Button
        title="Contact Support"
        variant="primary"
        onPress={() => router.push("/contact")}
        style={styles.actionButton}
        icon={<Ionicons name="headset-outline" size={20} color={Colors.background.primary} />}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderIntro()}
        {renderGeneralTips()}
        {renderRedFlags()}
        {renderReportingTools()}
        {renderEmergencyInfo()}
        {renderActions()}
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

  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },

  introCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    alignItems: "center",
  },

  introHeader: {
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },

  introTitle: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Layout.spacing.sm,
  },

  introText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: Layout.typography.lineHeight.base,
  },

  section: {
    marginBottom: Layout.spacing.xl,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.lg,
  },

  tipCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },

  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },

  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Layout.spacing.md,
  },

  tipTitle: {
    flex: 1,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },

  tipDescription: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
    marginLeft: 60, // Account for icon width + margin
  },

  toolsCard: {
    padding: Layout.spacing.lg,
  },

  toolItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  toolContent: {
    flex: 1,
    marginLeft: Layout.spacing.md,
  },

  toolTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  toolDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.sm,
  },

  toolDivider: {
    height: 1,
    backgroundColor: Colors.border.primary,
    marginVertical: Layout.spacing.lg,
    marginLeft: 32, // Account for icon width
  },

  emergencyCard: {
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error[200],
  },

  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },

  emergencyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.error[500],
    marginLeft: Layout.spacing.sm,
  },

  emergencyText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },

  emergencyNumbers: {
    gap: Layout.spacing.sm,
  },

  emergencyNumber: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.error[500],
  },

  actionsSection: {
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },

  actionButton: {
    width: "100%",
  },
});