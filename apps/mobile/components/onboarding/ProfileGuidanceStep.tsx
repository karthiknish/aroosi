import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { OnboardingStepProps } from './OnboardingContainer';

interface ProfileStepGuide {
  id: string;
  title: string;
  description: string;
  icon: string;
  importance: 'high' | 'medium' | 'low';
  tips: string[];
}

const profileSteps: ProfileStepGuide[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Your name, age, and gender',
    icon: 'person-outline',
    importance: 'high',
    tips: [
      'Use your real name for trust',
      'Be honest about your age',
      'Complete all required fields'
    ]
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Where you live in the UK',
    icon: 'location-outline',
    importance: 'high',
    tips: [
      'Select your current city',
      'Add postcode for better matches',
      'Consider privacy preferences'
    ]
  },
  {
    id: 'about-me',
    title: 'About Me',
    description: 'Tell your story',
    icon: 'document-text-outline',
    importance: 'high',
    tips: [
      'Write 2-3 paragraphs',
      'Share your interests and values',
      'Be authentic and positive'
    ]
  },
  {
    id: 'education-career',
    title: 'Education & Career',
    description: 'Your professional background',
    icon: 'school-outline',
    importance: 'medium',
    tips: [
      'Include highest education level',
      'Mention your profession',
      'Share career aspirations'
    ]
  },
  {
    id: 'cultural-background',
    title: 'Cultural Background',
    description: 'Your heritage and traditions',
    icon: 'globe-outline',
    importance: 'medium',
    tips: [
      'Share your ethnic background',
      'Mention languages you speak',
      'Include religious practices'
    ]
  },
  {
    id: 'photos',
    title: 'Profile Photos',
    description: 'Show your best self',
    icon: 'camera-outline',
    importance: 'high',
    tips: [
      'Add at least 3-4 clear photos',
      'Include a variety of shots',
      'Smile and look at the camera'
    ]
  }
];

export default function ProfileGuidanceStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: OnboardingStepProps) {
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return Colors.error[500];
      case 'medium': return Colors.warning[500];
      case 'low': return Colors.success[500];
      default: return Colors.neutral[400];
    }
  };

  const getImportanceText = (importance: string) => {
    switch (importance) {
      case 'high': return 'Required';
      case 'medium': return 'Important';
      case 'low': return 'Optional';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-done-circle" size={60} color={Colors.success[500]} />
          </View>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            A complete profile gets 10x more matches. Here's what you'll need to add:
          </Text>
        </View>

        {/* Profile Steps */}
        <View style={styles.stepsContainer}>
          {profileSteps.map((step, index) => (
            <View key={step.id} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={24} color={Colors.primary[500]} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                <View style={[
                  styles.importanceBadge, 
                  { backgroundColor: getImportanceColor(step.importance) }
                ]}>
                  <Text style={styles.importanceText}>
                    {getImportanceText(step.importance)}
                  </Text>
                </View>
              </View>

              <View style={styles.tipsContainer}>
                {step.tips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipItem}>
                    <View style={styles.tipBullet} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Completion Estimate */}
        <View style={styles.estimateContainer}>
          <Ionicons name="time-outline" size={20} color={Colors.text.secondary} />
          <Text style={styles.estimateText}>
            Estimated completion time: 5-10 minutes
          </Text>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <View style={styles.navigationButtons}>
          {!isFirst && (
            <TouchableOpacity style={styles.backButton} onPress={onPrev}>
              <Ionicons name="chevron-back" size={20} color={Colors.text.secondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.rightButtons}>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>
                {isLast ? 'Start Building Profile' : 'Continue'}
              </Text>
              <Ionicons 
                name={isLast ? "rocket" : "chevron-forward"} 
                size={20} 
                color={Colors.background.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },

  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },

  iconContainer: {
    marginBottom: Layout.spacing.md,
  },

  title: {
    fontSize: Layout.typography.fontSize['2xl'],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },

  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  stepsContainer: {
    gap: Layout.spacing.md,
  },

  stepCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.md,
  },

  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },

  stepInfo: {
    flex: 1,
  },

  stepTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  stepDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
  },

  importanceBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },

  importanceText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.semibold,
  },

  tipsContainer: {
    gap: Layout.spacing.sm,
  },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.sm,
  },

  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary[500],
    marginTop: 8,
  },

  tipText: {
    flex: 1,
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xl,
    padding: Layout.spacing.md,
    backgroundColor: Colors.warning[50],
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.warning[200],
  },

  estimateText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  navigationContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },

  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
  },

  backButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },

  skipButton: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
  },

  skipButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.tertiary,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  nextButton: {
    backgroundColor: Colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.md,
  },

  nextButtonText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.background.primary,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});