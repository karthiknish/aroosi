import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
// @ts-expect-error expo vector icons
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../constants";
import { useApiClient } from "../utils/api";
import { ReportReason } from "../types";
import { Button } from "../components/ui";
import PlatformCard from "../components/ui/PlatformCard";
import PlatformHaptics from "../utils/PlatformHaptics";

interface ReportReasonOption {
  id: ReportReason;
  title: string;
  description: string;
  icon: string;
}

const REPORT_REASONS: ReportReasonOption[] = [
  {
    id: 'inappropriate_content',
    title: 'Inappropriate Content',
    description: 'Sharing inappropriate photos, messages, or content',
    icon: 'image-outline',
  },
  {
    id: 'harassment',
    title: 'Harassment or Bullying',
    description: 'Sending threatening, abusive, or harassing messages',
    icon: 'warning-outline',
  },
  {
    id: 'fake_profile',
    title: 'Fake Profile',
    description: 'Using fake photos, information, or impersonating someone',
    icon: 'person-remove-outline',
  },
  {
    id: 'spam',
    title: 'Spam or Scam',
    description: 'Sending unsolicited messages or attempting to scam',
    icon: 'mail-outline',
  },
  {
    id: 'safety_concern',
    title: 'Safety Concern',
    description: 'Behavior that makes you feel unsafe or uncomfortable',
    icon: 'shield-outline',
  },
  {
    id: 'inappropriate_behavior',
    title: 'Inappropriate Behavior',
    description: 'Violating community guidelines or being disrespectful',
    icon: 'alert-circle-outline',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Something else that violates our community standards',
    icon: 'ellipsis-horizontal-outline',
  },
];

export default function ReportUserScreen() {
  const { userId, userName } = useLocalSearchParams<{ 
    userId: string; 
    userName?: string;
  }>();
  const apiClient = useApiClient();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReport = async () => {
    if (!selectedReason || !userId) {
      Alert.alert('Missing Information', 'Please select a reason for reporting.');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('Description Required', 'Please provide details about the issue.');
      return;
    }

    try {
      setSubmitting(true);
      await PlatformHaptics.medium();

      const response = await apiClient.reportUser(
        userId,
        selectedReason,
        description.trim() || undefined
      );

      if (response.success) {
        await PlatformHaptics.success();
        
        Alert.alert(
          'Report Submitted',
          'Thank you for reporting this user. Our team will review the report and take appropriate action.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        await PlatformHaptics.error();
        Alert.alert('Error', response.error || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      await PlatformHaptics.error();
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Report User</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderUserInfo = () => (
    <PlatformCard style={styles.userInfoCard}>
      <View style={styles.userInfoHeader}>
        <Ionicons name="flag-outline" size={24} color={Colors.error[500]} />
        <Text style={styles.userInfoTitle}>
          Reporting {userName || 'User'}
        </Text>
      </View>
      <Text style={styles.userInfoText}>
        Your report helps keep our community safe. All reports are reviewed by our team 
        and appropriate action will be taken.
      </Text>
    </PlatformCard>
  );

  const renderReasonOption = (reason: ReportReasonOption) => {
    const isSelected = selectedReason === reason.id;
    
    return (
      <TouchableOpacity
        key={reason.id}
        style={[
          styles.reasonOption,
          isSelected && styles.selectedReasonOption,
        ]}
        onPress={() => {
          setSelectedReason(reason.id);
          PlatformHaptics.light();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.reasonContent}>
          <View style={styles.reasonHeader}>
            <Ionicons 
              name={reason.icon as any} 
              size={20} 
              color={isSelected ? Colors.error[500] : Colors.text.secondary} 
            />
            <Text style={[
              styles.reasonTitle,
              isSelected && styles.selectedReasonTitle,
            ]}>
              {reason.title}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.error[500]} />
            )}
          </View>
          <Text style={styles.reasonDescription}>
            {reason.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDescriptionInput = () => {
    if (selectedReason !== 'other' && selectedReason) {
      return (
        <PlatformCard style={styles.descriptionCard}>
          <Text style={styles.descriptionLabel}>
            Additional Details (Optional)
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Provide additional context about this report..."
            placeholderTextColor={Colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {description.length}/500
          </Text>
        </PlatformCard>
      );
    }

    if (selectedReason === 'other') {
      return (
        <PlatformCard style={styles.descriptionCard}>
          <Text style={styles.descriptionLabel}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Please describe the issue in detail..."
            placeholderTextColor={Colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {description.length}/500
          </Text>
        </PlatformCard>
      );
    }

    return null;
  };

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <Button
        title="Submit Report"
        onPress={handleSubmitReport}
        loading={submitting}
        disabled={!selectedReason || (selectedReason === 'other' && !description.trim())}
        style={styles.submitButton}
        variant="primary"
      />
      
      <Button
        title="Cancel"
        onPress={() => router.back()}
        variant="ghost"
        style={styles.cancelButton}
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
        {renderUserInfo()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's happening?</Text>
          <Text style={styles.sectionSubtitle}>
            Select the issue you're experiencing with this user:
          </Text>
          
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map(renderReasonOption)}
          </View>
        </View>

        {renderDescriptionInput()}
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

  userInfoCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },

  userInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },

  userInfoTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginLeft: Layout.spacing.sm,
  },

  userInfoText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.base,
  },

  section: {
    marginBottom: Layout.spacing.lg,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  sectionSubtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
  },

  reasonsList: {
    gap: Layout.spacing.sm,
  },

  reasonOption: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    padding: Layout.spacing.lg,
  },

  selectedReasonOption: {
    borderColor: Colors.error[500],
    backgroundColor: Colors.error[50],
  },

  reasonContent: {
    flex: 1,
  },

  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.xs,
  },

  reasonTitle: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginLeft: Layout.spacing.sm,
  },

  selectedReasonTitle: {
    color: Colors.error[500],
  },

  reasonDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginLeft: 32, // Account for icon width + margin
    lineHeight: Layout.typography.lineHeight.sm,
  },

  descriptionCard: {
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },

  descriptionLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },

  required: {
    color: Colors.error[500],
  },

  descriptionInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    padding: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
    minHeight: 100,
  },

  characterCount: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: "right",
    marginTop: Layout.spacing.xs,
  },

  actionsSection: {
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },

  submitButton: {
    width: "100%",
  },

  cancelButton: {
    width: "100%",
  },
});